package com.clucky.shippingservice.service;

import com.clucky.shippingservice.mapper.EventMapper;
import com.clucky.shippingservice.logging.SafeLog;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class OrderCreatedConsumer {
    private final EventMapper mapper;
    private final ShipmentServiceTemplate service;

    public OrderCreatedConsumer(EventMapper mapper, ShipmentServiceTemplate service) {
        this.mapper = mapper;
        this.service = service;
    }

    @KafkaListener(topics = "order.created", groupId = "${spring.kafka.consumer.group-id:shipping-service}")
    public void receive(ConsumerRecord<String, String> record, Acknowledgment acknowledgment) {
        var event = mapper.fromJson(record.value(), record.topic());
        var previous = MDC.getCopyOfContextMap();
        try {
            MDC.put("correlationId", event.correlationId());
            MDC.put("eventId", SafeLog.token(event.eventId()));
            service.createFromOrder(event);
            acknowledgment.acknowledge();
        } finally {
            if (previous == null) MDC.clear();
            else MDC.setContextMap(previous);
        }
    }
}
