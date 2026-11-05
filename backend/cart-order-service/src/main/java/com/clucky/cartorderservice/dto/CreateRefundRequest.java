package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRefundRequest(
        @NotNull(message = "orderId is required") Long orderId,
        @NotBlank(message = "reason is required") String reason
) {}
