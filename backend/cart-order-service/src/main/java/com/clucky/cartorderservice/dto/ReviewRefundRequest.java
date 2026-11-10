package com.clucky.cartorderservice.dto;

import jakarta.validation.constraints.Size;

public record ReviewRefundRequest(
        @Size(max = 1000) String reason,
        @Size(max = 1000) String note
) {
    public String effectiveReason() {
        if (reason != null && !reason.isBlank()) return reason.trim();
        if (note != null && !note.isBlank()) return note.trim();
        return null;
    }
}

