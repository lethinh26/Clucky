package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.entity.OutboxEvent;
import com.clucky.cartorderservice.mapper.EventMapper;
import com.clucky.cartorderservice.repository.OutboxEventRepository;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class OutboxProcessor {
    private static final Logger LOG = LoggerFactory.getLogger(OutboxProcessor.class);
    private static final int MAX_RETRIES = 10;

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final EventMapper eventMapper;
    private final TransactionTemplate transaction;

    public OutboxProcessor(
            OutboxEventRepository outboxEventRepository,
            KafkaTemplate<String, String> kafkaTemplate,
            EventMapper eventMapper,
            PlatformTransactionManager transactionManager
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.eventMapper = eventMapper;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Dispatches the event immediately after the database transaction successfully commits.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderEventCreated(OrderEventPublisher.OutboxEventCreatedEvent event) {
        LOG.debug("event=outbox_after_commit_received outboxId={} topic={} orderCode={}",
                event.outboxId(), event.topic(), event.orderCode());
        processSingleEvent(event.outboxId());
    }

    /**
     * Scheduled fallback worker: queries pending outbox events every 5 seconds to guarantee At-Least-Once Delivery.
     */
    @Scheduled(fixedDelay = 5000)
    public void pollPendingOutboxEvents() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        if (pendingEvents.isEmpty()) {
            return;
        }

        LOG.info("event=outbox_polling_pending count={}", pendingEvents.size());
        for (OutboxEvent event : pendingEvents) {
            processSingleEvent(event.getId());
        }
    }

    public void processSingleEvent(Long outboxId) {
        transaction.executeWithoutResult(status -> dispatch(outboxId));
    }

    private void dispatch(Long outboxId) {
        Optional<OutboxEvent> opt = outboxEventRepository.findById(outboxId);
        if (opt.isEmpty()) {
            return;
        }

        OutboxEvent outbox = opt.get();
        if (!"PENDING".equals(outbox.getStatus())) {
            return;
        }

        try {
            DomainEvent domainEvent = eventMapper.fromJson(outbox.getPayload(), outbox.getTopic());
            ProducerRecord<String, String> record = eventMapper.toRecord(domainEvent, outbox.getAggregateId());

            // Synchronously send with timeout to verify broker ACK before marking PROCESSED
            var sendResult = kafkaTemplate.send(record).get(3, TimeUnit.SECONDS);

            outbox.setStatus("PROCESSED");
            outbox.setProcessedAt(Instant.now());
            outbox.setLastError(null);
            outboxEventRepository.save(outbox);

            LOG.info("event=outbox_event_published outboxId={} eventId={} topic={} aggregateId={} partition={} offset={}",
                    outbox.getId(), outbox.getEventId(), outbox.getTopic(), outbox.getAggregateId(),
                    sendResult.getRecordMetadata().partition(),
                    sendResult.getRecordMetadata().offset());
        } catch (Exception ex) {
            int newRetry = outbox.getRetryCount() + 1;
            outbox.setRetryCount(newRetry);
            outbox.setLastError(ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName());
            if (newRetry >= MAX_RETRIES && !outbox.getTopic().startsWith("refund.") && !"audit.recorded".equals(outbox.getTopic())) {
                outbox.setStatus("FAILED");
                LOG.error("event=outbox_event_max_retries_exceeded outboxId={} eventId={} topic={} error={}",
                        outbox.getId(), outbox.getEventId(), outbox.getTopic(), ex.getMessage());
            } else {
                LOG.warn("event=outbox_event_send_retry outboxId={} eventId={} retryCount={} error={}",
                        outbox.getId(), outbox.getEventId(), newRetry, ex.getMessage());
            }
            outboxEventRepository.save(outbox);
        }
    }
}
