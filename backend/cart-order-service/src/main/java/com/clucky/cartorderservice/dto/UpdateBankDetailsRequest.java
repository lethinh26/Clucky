package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateBankDetailsRequest(
        @NotBlank @Size(max = 100) String bankName,
        @NotBlank @Size(max = 80) String bankAccountNo,
        @NotBlank @Size(max = 160) String bankAccountName
) {}

