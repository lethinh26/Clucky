package com.clucky.identityservice.service;

import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;

/** Normalize Vietnamese domestic numbers for Bridge, and accept international E.164. */
public final class PhoneNumbers {
    private PhoneNumbers() {}

    public static String normalize(String input) {
        if (input == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String value = input.trim();
        if (value.matches("0[0-9]{9}")) return "+84" + value.substring(1);
        if (value.matches("\\+[1-9][0-9]{7,14}")) return value;
        throw new ApiException(ErrorCode.VALIDATION_ERROR);
    }

    public static String legacyVietnamese(String normalized) {
        return normalized != null && normalized.matches("\\+84[0-9]{9}")
                ? "0" + normalized.substring(3) : normalized;
    }

    public static boolean equivalent(String stored, String supplied) {
        if (java.util.Objects.equals(stored, supplied)) return true;
        try { return normalize(stored).equals(normalize(supplied)); }
        catch (ApiException failure) { return false; }
    }
}
