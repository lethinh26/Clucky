package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.mapper.EventMapper;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class OrderPaymentWorker {
    private final OrderPaymentService service;
    private final EventMapper mapper;
    private final JdbcTemplate jdbc;
    public OrderPaymentWorker(OrderPaymentService service, EventMapper mapper, JdbcTemplate jdbc) {
        this.service = service; this.mapper = mapper; this.jdbc = jdbc;
    }

    @KafkaListener(topics = "payment.received", groupId = "clucky-order-payment-v1")
    public void received(String json, Acknowledgment acknowledgment) {
        var event = mapper.fromJson(json, "payment.received");
        try {
            MDC.put("correlationId", event.correlationId()); MDC.put("eventId", event.eventId());
            service.decide(event);
            acknowledgment.acknowledge();
        } finally { MDC.remove("correlationId"); MDC.remove("eventId"); }
    }

    @Scheduled(fixedDelay = 5000)
    public void expire() {
        try {
            for (Long id : jdbc.queryForList("SELECT id FROM order_service.orders WHERE status='PENDING_PAYMENT' "
                    + "AND payment_expires_at<=now() ORDER BY payment_expires_at LIMIT 50", Long.class)) service.expire(id);
        } catch (RuntimeException failure) { LoggerFactory.getLogger(getClass()).warn("event=order_payment_expiry_pending"); }
    }
}
