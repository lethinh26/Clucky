package com.clucky.catalogstoreservice.entity;

public enum StoreStatus {
    OPEN,
    CLOSED_TEMP,
    INACTIVE;

    public static StoreStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return OPEN;
        }
        String normalized = value.trim().toUpperCase();
        if ("ACTIVE".equals(normalized)) {
            return OPEN;
        }
        for (StoreStatus status : values()) {
            if (status.name().equals(normalized)) {
                return status;
            }
        }
        throw new IllegalArgumentException(
                "Trạng thái chi nhánh không hợp lệ: '" + value + "'. Các trạng thái hợp lệ: OPEN, CLOSED_TEMP, INACTIVE"
        );
    }

    public boolean isOpen() {
        return this == OPEN;
    }

    public boolean isClosedTemp() {
        return this == CLOSED_TEMP;
    }

    public boolean isInactive() {
        return this == INACTIVE;
    }
}
