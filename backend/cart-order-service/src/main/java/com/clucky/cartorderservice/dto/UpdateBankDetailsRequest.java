package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateBankDetailsRequest(
        @NotBlank @Pattern(regexp = "\\d{6}") String bankBin,
        @Size(max = 100) String bankName,
        @NotBlank @Pattern(regexp = "\\d{1,80}") @Size(max = 80) String bankAccountNo,
        @NotBlank @Size(max = 160) String bankAccountName,
        @jakarta.validation.constraints.Min(1) Integer expectedBankDetailsVersion
) {
    public UpdateBankDetailsRequest(String legacyBankName, String bankAccountNo, String legacyAccountHolderName) {
        this((String) null, legacyBankName, bankAccountNo, legacyAccountHolderName, (Integer) null);
    }
}
