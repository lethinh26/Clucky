package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateOrderStatusRequest(
        @NotBlank(message = "status is required") String status,
        @jakarta.validation.constraints.Size(max = 1000) String note
) {}
