package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectOrderRequest(
        @NotBlank(message = "reason is required") String reason
) {}
