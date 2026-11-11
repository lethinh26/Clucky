package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateOrderStatusRequest(
        @NotBlank(message = "status is required") String status,
        @Size(max = 1000) String note,
        String paymentStatus
) {
    public UpdateOrderStatusRequest(String status, String note) {
        this(status, note, null);
    }
}
