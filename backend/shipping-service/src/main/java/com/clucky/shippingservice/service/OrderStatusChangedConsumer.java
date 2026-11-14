package com.clucky.shippingservice.service;

import com.clucky.shippingservice.mapper.EventMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class OrderStatusChangedConsumer {
    private final EventMapper mapper;
    private final MockDeliveryEngine engine;

    public OrderStatusChangedConsumer(EventMapper mapper, MockDeliveryEngine engine) {
        this.mapper = mapper;
        this.engine = engine;
    }

    @KafkaListener(topics = "order.status-changed",
            groupId = "${spring.kafka.consumer.group-id:shipping-service}")
    public void onOrderStatus(ConsumerRecord<String, String> record, Acknowledgment acknowledgment) {
        engine.acceptOrderStatus(mapper.fromJson(record.value(), record.topic()));
        acknowledgment.acknowledge();
    }
}
