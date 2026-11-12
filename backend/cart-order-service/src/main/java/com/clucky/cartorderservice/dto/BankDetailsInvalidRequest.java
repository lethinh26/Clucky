package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BankDetailsInvalidRequest(
        @NotBlank @Size(max = 1000) String reason,
        Boolean transferNotCompleted
) {
    public BankDetailsInvalidRequest(String reason) { this(reason, null); }
}

