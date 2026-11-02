package com.clucky.catalogstoreservice.dto;

import java.math.BigDecimal;

public record StoreProductResponse(
        Long id,
        Long storeId,
        Long productId,
        BigDecimal storePrice,
        Boolean isAvailable,
        Boolean isSoldOut
) {}
