package com.clucky.promotionloyaltyservice.mapper;

import com.clucky.promotionloyaltyservice.dto.*;
import com.clucky.promotionloyaltyservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static VoucherResponse toResponse(Voucher entity) {
        return new VoucherResponse(
                entity.getId(),
                entity.getCode(),
                entity.getType(),
                entity.getValue(),
                entity.getMinOrderAmount(),
                entity.getMaxDiscount(),
                entity.getTotalLimit(),
                entity.getUsedCount(),
                entity.getStartAt(),
                entity.getEndAt(),
                entity.getScope(),
                entity.getStoreId(),
                entity.getStatus()
        );
    }

    public static VoucherUsageResponse toResponse(VoucherUsage entity) {
        return new VoucherUsageResponse(
                entity.getId(),
                entity.getVoucherId(),
                entity.getCustomerId(),
                entity.getOrderId(),
                entity.getUsedAt()
        );
    }

    public static BannerResponse toResponse(Banner entity) {
        return new BannerResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getImageUrl(),
                entity.getImagePublicId(),
                entity.getLinkUrl(),
                entity.getPosition(),
                entity.getStartAt(),
                entity.getEndAt(),
                entity.getIsActive()
        );
    }

    public static MemberPointsResponse toResponse(MemberPoints entity) {
        return new MemberPointsResponse(
                entity.getId(),
                entity.getCustomerId(),
                entity.getTotalPoints(),
                entity.getTier(),
                entity.getUpdatedAt()
        );
    }

    public static PointTransactionResponse toResponse(PointTransaction entity) {
        return new PointTransactionResponse(
                entity.getId(),
                entity.getCustomerId(),
                entity.getOrderId(),
                entity.getChange(),
                entity.getBalanceAfter(),
                entity.getType(),
                entity.getCreatedAt()
        );
    }

    public static LoyaltyConfigResponse toResponse(LoyaltyConfig entity) {
        return new LoyaltyConfigResponse(
                entity.getId(),
                entity.getEarnRate(),
                entity.getRedeemRate(),
                entity.getUpdatedBy()
        );
    }
}
