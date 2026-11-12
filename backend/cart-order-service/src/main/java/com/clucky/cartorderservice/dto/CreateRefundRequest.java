package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateRefundRequest(
        @NotNull Long orderId,
        @NotBlank @Size(max = 1000) String reason,
        @NotBlank @Pattern(regexp = "\\d{6}") String bankBin,
        @Size(max = 100) String bankName,
        @NotBlank @Pattern(regexp = "\\d{1,80}") @Size(max = 80) String bankAccountNo,
        @NotBlank @Size(max = 160) String bankAccountName
) {
    public CreateRefundRequest(Long orderId, String reason, String bankBin, String bankAccountNo) {
        this(orderId, reason, bankBin, null, bankAccountNo, null);
    }

    public CreateRefundRequest(Long orderId, String reason, String legacyBankName,
            String bankAccountNo, String legacyBankAccountName) {
        this(orderId, reason, null, legacyBankName, bankAccountNo, legacyBankAccountName);
    }
}
