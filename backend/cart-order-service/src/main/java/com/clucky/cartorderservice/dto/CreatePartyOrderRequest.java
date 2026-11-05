package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreatePartyOrderRequest(
        @NotNull(message = "storeId is required")
        @Positive(message = "storeId must be positive")
        Long storeId,

        @NotBlank(message = "contactName is required")
        @Size(max = 160, message = "contactName cannot exceed 160 characters")
        String contactName,

        @NotBlank(message = "phone is required")
        @Size(max = 30, message = "phone cannot exceed 30 characters")
        String phone,

        @NotNull(message = "expectedDate is required")
        @Future(message = "expectedDate must be in the future")
        LocalDate expectedDate,

        @NotNull(message = "guestCount is required")
        @Min(value = 1, message = "guestCount must be at least 1")
        Integer guestCount,

        @NotBlank(message = "content is required")
        String content
) {}
