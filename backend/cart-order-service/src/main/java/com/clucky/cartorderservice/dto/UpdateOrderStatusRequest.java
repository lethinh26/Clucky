package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateOrderStatusRequest(
        @NotBlank(message = "status is required") String status,
        String note
) {}
