package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.mapper.EventMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class OrderStockConsumer {
    private final EventMapper mapper;
    private final OrderStockService stock;
    public OrderStockConsumer(EventMapper mapper, OrderStockService stock) { this.mapper = mapper; this.stock = stock; }

    @KafkaListener(topics = {"order.created", "order.cancelled"}, groupId = "catalog-order-stock")
    public void onEvent(ConsumerRecord<String, String> record, Acknowledgment acknowledgment) {
        stock.apply(mapper.fromJson(record.value(), record.topic()));
        acknowledgment.acknowledge();
    }
}
