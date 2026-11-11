package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateOrderStatusRequest(
        @NotBlank(message = "status is required") String status,
        @Size(max = 1000) String note,
        String paymentStatus,
        Long version
) {
    public UpdateOrderStatusRequest(String status, String note) {
        this(status, note, null, null);
    }

    public UpdateOrderStatusRequest(String status, String note, String paymentStatus) {
        this(status, note, paymentStatus, null);
    }
}
