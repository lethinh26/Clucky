package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.mapper.EventMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "clucky.reports.revenue-event")
public class ReportEventConsumer {
    private static final Logger log = LoggerFactory.getLogger(ReportEventConsumer.class);
    private final ReportProjectionService projectionService;
    private final EventMapper eventMapper;

    public ReportEventConsumer(ReportProjectionService projectionService, EventMapper eventMapper) {
        this.projectionService = projectionService;
        this.eventMapper = eventMapper;
    }

    @KafkaListener(topics = {"order.completed", "payment.confirmed", "order.cancelled"},
            groupId = "${spring.kafka.consumer.group-id:review-report-service}")
    public void onEvent(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            DomainEvent event = eventMapper.fromJson(record.value(), record.topic());
            if ("order.cancelled".equals(event.eventType())) {
                projectionService.handleOrderCancelled(event);
            } else {
                projectionService.processProjectionEvent(event);
            }
            ack.acknowledge();
        } catch (RuntimeException failure) {
            log.warn("event=report_projection_failed topic={} partition={} offset={} failureType={}",
                    record.topic(), record.partition(), record.offset(), failure.getClass().getSimpleName());
            throw failure;
        }
    }
}
