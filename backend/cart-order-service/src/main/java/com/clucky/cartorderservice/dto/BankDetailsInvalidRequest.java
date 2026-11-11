package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BankDetailsInvalidRequest(
        @NotBlank @Size(max = 1000) String reason
) {}

