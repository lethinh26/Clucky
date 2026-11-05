package com.clucky.cartorderservice.dto;

public enum OrderStatus {
    PENDING_PAYMENT,
    CONFIRMED,
    PREPARING,
    READY,
    SHIPPING,
    COMPLETED,
    CANCELLED;

    public static OrderStatus fromString(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return OrderStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED;
    }
}
