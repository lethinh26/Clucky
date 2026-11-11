package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateRefundRequest(
        @NotNull Long orderId,
        @NotBlank @Size(max = 1000) String reason,
        @Size(max = 100) String bankName,
        @Size(max = 80) String bankAccountNo,
        @Size(max = 160) String bankAccountName
) {}
