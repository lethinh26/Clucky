package com.clucky.catalogstoreservice.dto;

import java.math.BigDecimal;

public record ProductOptionResponse(
        Long id,
        Long productId,
        String groupName,
        String name,
        BigDecimal extraPrice
) {}
