package com.clucky.catalogstoreservice.dto;

import java.math.BigDecimal;

public record ProductToppingResponse(
        Long id,
        Long productId,
        String toppingName,
        BigDecimal extraPrice
) {}
