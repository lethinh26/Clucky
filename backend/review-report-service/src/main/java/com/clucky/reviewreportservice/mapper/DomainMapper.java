package com.clucky.reviewreportservice.mapper;

import com.clucky.reviewreportservice.dto.*;
import com.clucky.reviewreportservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static ReviewResponse toResponse(Review entity) {
        return new ReviewResponse(
                entity.getId(),
                entity.getCustomerId(),
                entity.getProductId(),
                entity.getOrderId(),
                entity.getRating(),
                entity.getComment(),
                entity.getStatus(),
                entity.getCreatedAt()
        );
    }

    public static ReviewReplyResponse toResponse(ReviewReply entity) {
        return new ReviewReplyResponse(
                entity.getId(),
                entity.getReviewId(),
                entity.getResponderId(),
                entity.getResponderRole(),
                entity.getContent(),
                entity.getCreatedAt()
        );
    }

    public static DailyStoreStatsResponse toResponse(DailyStoreStats entity) {
        return new DailyStoreStatsResponse(
                entity.getId(),
                entity.getStoreId(),
                entity.getStatDate(),
                entity.getOrderCount(),
                entity.getRevenue(),
                entity.getCodAmount(),
                entity.getTransferAmount()
        );
    }
}
