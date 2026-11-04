package com.clucky.catalogstoreservice.dto;

import java.time.Instant;

public record StoreInventoryResponse(
        Long id,
        Long storeId,
        Long productId,
        Integer quantityAvailable,
        Integer lowStockThreshold,
        Long updatedBy,
        Instant updatedAt
) {}
