package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.DomainEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import java.time.Duration;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.web.client.RestClientBuilderConfigurer;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class LoyaltyEvents {
    private static final Logger LOG = LoggerFactory.getLogger(LoyaltyEvents.class);
    private final LoyaltyService loyalty;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final RestClient orders;
    private final String orderUrl;
    private final String token;
    public LoyaltyEvents(LoyaltyService loyalty, ObjectMapper mapper, Validator validator,
            @LoadBalanced RestClient.Builder builder, @Value("${clucky.loyalty.order-url:http://cart-order-service}") String orderUrl,
            @Value("${clucky.loyalty.internal-token:}") String token) {
        this.loyalty = loyalty; this.mapper = mapper; this.validator = validator;
        this.orders = builder.build(); this.orderUrl = orderUrl; this.token = token;
    }
    @KafkaListener(topics = {"order.created", "order.completed", "order.cancelled"}, groupId = "loyalty-ledger-v1")
    public void consume(org.apache.kafka.clients.consumer.ConsumerRecord<String, String> record, Acknowledgment acknowledgment) throws Exception {
        DomainEvent event = mapper.readValue(record.value(), DomainEvent.class);
        if (!validator.validate(event).isEmpty() || !"cart-order-service".equals(event.sourceService())
                || !record.topic().equals(event.eventType())) throw new IllegalArgumentException("Invalid loyalty event");
        var payload = event.payload();
        if (!payload.path("orderId").canConvertToLong() || !payload.path("customerId").canConvertToLong()
                || payload.path("orderId").asLong() <= 0 || payload.path("customerId").asLong() <= 0)
            throw new IllegalArgumentException("Invalid loyalty event identity");
        long orderId = payload.path("orderId").asLong();
        long customerId = payload.path("customerId").asLong();
        OrderState state = orderState(orderId, customerId);
        loyalty.settle(orderId, customerId, state.status(), event.eventId(), event.correlationId());
        acknowledgment.acknowledge();
    }
    public record OrderState(long customerId, String status) {}
    private OrderState orderState(long orderId, long customerId) {
        OrderState state = orders.get().uri(orderUrl + "/internal/loyalty/orders/" + orderId)
                .header("X-Loyalty-Service-Token", token).retrieve().body(OrderState.class);
        if (state == null || state.customerId() != customerId || !Set.of("PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "SHIPPING", "COMPLETED", "CANCELLED").contains(state.status()))
            throw new IllegalStateException("Invalid order reconciliation response");
        return state;
    }
    @Scheduled(fixedDelayString="${clucky.loyalty.reconcile-delay-ms:60000}")
    public void reconcile() {
        for (var pending : loyalty.pending()) {
            try {
                OrderState state = orderState(pending.orderId(), pending.customerId());
                loyalty.settle(pending.orderId(), pending.customerId(), state.status(), null, null);
            } catch (RestClientResponseException failure) {
                if (failure.getStatusCode().value() == 404) loyalty.settle(pending.orderId(), pending.customerId(), "MISSING", null, null);
                else LOG.warn("event=loyalty_reconcile_deferred orderId={} status={}", pending.orderId(), failure.getStatusCode().value());
            } catch (Exception failure) {
                LOG.warn("event=loyalty_reconcile_deferred orderId={}", pending.orderId());
            }
        }
    }
    @Configuration(proxyBeanMethods=false)
    @EnableScheduling
    static class ClientConfig {
        @Bean
        @LoadBalanced
        RestClient.Builder loyaltyOrderClient(RestClientBuilderConfigurer configurer) {
            var factory = new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
            factory.setReadTimeout(Duration.ofSeconds(10));
            return configurer.configure(RestClient.builder()).requestFactory(factory);
        }
    }
}
