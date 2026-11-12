package com.clucky.cartorderservice.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Instant;
import java.math.BigDecimal;

public record PartyOrderResponse(
        Long id,
        Long customerId,
        Long storeId,
        String contactName,
        String phone,
        String contactEmail,
        LocalDate expectedDate,
        LocalTime expectedTime,
        Integer guestCount,
        String packageCode,
        String content,
        String status,
        BigDecimal quoteAmount,
        String paymentMethod,
        String consultationNote,
        Instant updatedAt
) {}
