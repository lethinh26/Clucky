package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdatePartyOrderStatusRequest(
        @NotBlank(message = "status is required")
        @Pattern(regexp = "NEW|CONTACTED|QUOTED|CONFIRMED|CLOSED|CANCELLED", message = "Invalid party order status")
        String status,

        @Size(max = 2000) String note,
        BigDecimal quoteAmount,
        String paymentMethod
) {}
