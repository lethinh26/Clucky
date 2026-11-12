package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;

import java.time.LocalDate;
import java.time.LocalTime;

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

        @NotBlank @Email @Size(max = 254)
        String contactEmail,

        @NotNull(message = "expectedDate is required")
        LocalDate expectedDate,

        @NotNull LocalTime expectedTime,

        @NotNull(message = "guestCount is required")
        @Min(value = 1, message = "guestCount must be at least 1")
        Integer guestCount,

        @NotBlank @jakarta.validation.constraints.Pattern(regexp = "pkg-birthday|pkg-office|pkg-custom")
        String packageCode,

        @NotBlank(message = "content is required")
        @Size(max = 2000, message = "content cannot exceed 2000 characters")
        String content
) {}
