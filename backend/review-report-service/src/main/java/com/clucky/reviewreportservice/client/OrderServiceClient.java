package com.clucky.reviewreportservice.client;

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
