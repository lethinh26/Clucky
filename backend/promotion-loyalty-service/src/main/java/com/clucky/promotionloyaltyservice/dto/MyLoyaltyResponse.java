package com.clucky.promotionloyaltyservice.dto;

import java.util.List;

public record MyLoyaltyResponse(
        MemberPointsResponse points,
        List<PointTransactionResponse> transactions
) {}

