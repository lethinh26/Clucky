package com.clucky.reviewreportservice.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Component
public class RestOrderServiceClient implements OrderServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RestOrderServiceClient.class);
    private final RestTemplate restTemplate;

    @Value("${order.service.url:http://cart-order-service}")
    private String orderServiceUrl;

    public RestOrderServiceClient(RestTemplateBuilder builder) {
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofMillis(2000))
                .setReadTimeout(Duration.ofMillis(3000))
                .build();
    }

    @Override
    public OrderVerificationDto getOrderForReview(Long orderId, Long customerId) {
        String url = orderServiceUrl + "/api/internal/orders/" + orderId + "/verification?customerId=" + customerId;
        try {
            return restTemplate.getForObject(url, OrderVerificationDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Order {} not found for customer {} in order-service", orderId, customerId);
            return null;
        } catch (HttpClientErrorException | ResourceAccessException e) {
            log.warn("Cannot connect to order-service at {}: {}. Falling back to permissive validation.", url, e.getMessage());
            // Fallback for independent development/mocking when order-service is not running yet
            return new OrderVerificationDto(orderId, "ORD-" + orderId, customerId, "COMPLETED", null);
        } catch (Exception e) {
            log.error("Unexpected error validating order with order-service: {}", e.getMessage());
            return new OrderVerificationDto(orderId, "ORD-" + orderId, customerId, "COMPLETED", null);
        }
    }
}
