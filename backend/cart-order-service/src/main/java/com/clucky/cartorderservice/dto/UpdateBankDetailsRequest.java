package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateBankDetailsRequest(
        @NotBlank @Size(max = 100) String bankName,
        @com.fasterxml.jackson.annotation.JsonAlias("accountNumber") @NotBlank @Size(max = 80) String bankAccountNo,
        @com.fasterxml.jackson.annotation.JsonAlias("accountHolderName") @NotBlank @Size(max = 160) String bankAccountName,
        @jakarta.validation.constraints.Min(1) Integer expectedBankDetailsVersion
) {
    public UpdateBankDetailsRequest(String bankName, String bankAccountNo, String bankAccountName) {
        this(bankName, bankAccountNo, bankAccountName, null);
    }
}

