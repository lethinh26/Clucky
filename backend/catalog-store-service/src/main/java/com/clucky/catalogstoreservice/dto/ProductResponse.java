package com.clucky.catalogstoreservice.dto;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        Long categoryId,
        String name,
        String description,
        BigDecimal basePrice,
        String imageUrl,
        String imagePublicId,
        Integer kcal,
        Integer spicyLevel,
        Boolean isActive
) {}
