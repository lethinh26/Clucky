package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.mapper.EventMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class ShippingEventConsumer {
    private final ShippingOrderProjection projection;
    private final EventMapper mapper;

    public ShippingEventConsumer(ShippingOrderProjection projection, EventMapper mapper) {
        this.projection = projection;
        this.mapper = mapper;
    }

    @KafkaListener(topics = {"shipping.started", "shipping.delivered", "shipping.failed", "shipping.resolved"},
            groupId = "cart-order-service-group")
    public void onShippingEvent(ConsumerRecord<String, String> record, Acknowledgment ack) {
        DomainEvent event = mapper.fromJson(record.value(), record.topic());
        projection.apply(event);
        if (ack != null) ack.acknowledge();
    }
}
