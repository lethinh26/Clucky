package com.clucky.cartorderservice.dto;

public enum PartyOrderStatus {
    NEW,
    CONTACTED,
    QUOTED,
    CONFIRMED,
    CLOSED;

    public static PartyOrderStatus fromString(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return PartyOrderStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public boolean isTerminal() {
        return this == CLOSED;
    }
}
