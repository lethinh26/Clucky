package com.clucky.reviewreportservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

public interface OrderServiceClient {

    record OrderVerificationDto(
        Long id,
        String orderCode,
        Long customerId,
        String status,
        List<Long> productIds
    ) {}

    OrderVerificationDto getOrderForReview(Long orderId, Long customerId);
}
