package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.mapper.EventMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class ReportEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(ReportEventConsumer.class);

    private final ReportProjectionService projectionService;
    private final EventMapper eventMapper;

    public ReportEventConsumer(ReportProjectionService projectionService, EventMapper eventMapper) {
        this.projectionService = projectionService;
        this.eventMapper = eventMapper;
    }

    @KafkaListener(
            topics = {"order.completed", "payment.confirmed", "order.cancelled"},
            groupId = "${spring.kafka.consumer.group-id:review-report-service}"
    )
    public void onEvent(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            log.info("event=kafka_report_event_received topic={} partition={} offset={} key={}",
                    record.topic(), record.partition(), record.offset(), record.key());

            DomainEvent event = eventMapper.fromJson(record.value(), record.topic());
            if ("order.cancelled".equalsIgnoreCase(event.eventType())) {
                projectionService.handleOrderCancelled(event);
            } else {
                projectionService.processProjectionEvent(event);
            }

            if (ack != null) {
                ack.acknowledge();
            }
        } catch (IllegalArgumentException e) {
            log.error("event=kafka_report_event_invalid_payload error={} payload={}", e.getMessage(), record.value());
            if (ack != null) {
                ack.acknowledge();
            }
        } catch (Exception e) {
            log.error("event=kafka_report_event_error error={}", e.getMessage(), e);
            throw e;
        }
    }
}
