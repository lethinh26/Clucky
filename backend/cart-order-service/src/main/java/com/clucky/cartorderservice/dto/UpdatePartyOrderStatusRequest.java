package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdatePartyOrderStatusRequest(
        @NotBlank(message = "status is required")
        @Pattern(regexp = "NEW|CONTACTED|QUOTED|CONFIRMED|CLOSED|CANCELLED", message = "Invalid party order status")
        String status,

        String note
) {}
