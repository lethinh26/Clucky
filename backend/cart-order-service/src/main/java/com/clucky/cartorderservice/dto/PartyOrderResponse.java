package com.clucky.cartorderservice.dto;

import java.time.LocalDate;

public record PartyOrderResponse(
        Long id,
        Long customerId,
        Long storeId,
        String contactName,
        String phone,
        LocalDate expectedDate,
        Integer guestCount,
        String content,
        String status
) {}
