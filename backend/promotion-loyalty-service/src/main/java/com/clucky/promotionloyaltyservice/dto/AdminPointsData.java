package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AdminPointsData {
    private AdminPointsData() {}

    public record AdjustmentRequest(
            @NotNull @Min(0) @Max(2000000000L) Long newTotalPoints,
            @NotNull @Min(0) Long expectedTotalPoints,
            @NotBlank @Size(min = 3, max = 255) String reason,
            @NotNull UUID operationId) {}

    public record Adjustment(long id, long actorId, long previousPoints, long newPoints,
            long delta, String reason, Instant createdAt) {}

    public record Overview(LoyaltyData.Balance points, List<Adjustment> adjustments) {}
}
