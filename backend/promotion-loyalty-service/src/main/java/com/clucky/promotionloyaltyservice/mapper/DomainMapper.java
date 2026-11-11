package com.clucky.promotionloyaltyservice.mapper;

import com.clucky.promotionloyaltyservice.dto.*;
import com.clucky.promotionloyaltyservice.entity.*;
import com.clucky.promotionloyaltyservice.model.Voucher;

public final class DomainMapper {
    private DomainMapper() {}

    public static VoucherResponse toResponse(Voucher entity) {
        return VoucherResponse.fromEntity(entity);
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
        return BannerResponse.fromEntity(entity);
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
                entity.getCreatedAt(),
                entity.getReason()
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
