package com.clucky.reviewreportservice.client;

import java.util.List;

public interface OrderServiceClient {

    record OrderVerificationDto(
        Long id,
        String orderCode,
        Long customerId,
        String status,
        List<Long> productIds,
        Long storeId
    ) {
        public OrderVerificationDto(
            Long id,
            String orderCode,
            Long customerId,
            String status,
            List<Long> productIds
        ) {
            this(id, orderCode, customerId, status, productIds, null);
        }
    }

    record OrderStoreDto(
        Long orderId,
        Long storeId
    ) {}

    OrderVerificationDto getOrderForReview(Long orderId, Long customerId);

    Long getOrderStoreId(Long orderId);
}
