package com.clucky.identityservice.dto;

import java.time.LocalTime;

public record ShiftResponse(
        Long id,
        Long storeId,
        String name,
        LocalTime startTime,
        LocalTime endTime
) {}
