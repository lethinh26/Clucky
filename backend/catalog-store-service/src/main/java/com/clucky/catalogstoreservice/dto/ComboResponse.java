package com.clucky.catalogstoreservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ComboResponse(
        Long id,
        String name,
        String description,
        BigDecimal comboPrice,
        String imageUrl,
        String imagePublicId,
        Instant startAt,
        Instant endAt,
        Boolean isActive
) {}
