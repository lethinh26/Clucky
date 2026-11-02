package com.clucky.identityservice.dto;

import java.time.LocalDate;

public record StaffScheduleResponse(
        Long id,
        Long staffId,
        Long storeId,
        Long shiftId,
        LocalDate workDate,
        String status
) {}
