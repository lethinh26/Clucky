package com.clucky.catalogstoreservice.dto;

import java.time.Instant;
import java.time.LocalTime;

public record StoreResponse(
        Long id,
        String name,
        String address,
        String phone,
        LocalTime openTime,
        LocalTime closeTime,
        String status,
        String deliveryArea,
        Instant createdAt
) {}
