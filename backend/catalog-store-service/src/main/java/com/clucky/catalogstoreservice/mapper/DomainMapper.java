package com.clucky.catalogstoreservice.mapper;

import com.clucky.catalogstoreservice.dto.*;
import com.clucky.catalogstoreservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static StoreResponse toResponse(Store entity) {
        return new StoreResponse(
                entity.getId(),
                entity.getName(),
                entity.getAddress(),
                entity.getPhone(),
                entity.getOpenTime(),
                entity.getCloseTime(),
                entity.getStatus() != null ? entity.getStatus().name() : null,
                entity.getDeliveryArea(),
                entity.getCreatedAt() != null ? entity.getCreatedAt().toInstant() : null
        );
    }

    public static CategoryResponse toResponse(Category entity) {
        return new CategoryResponse(
                entity.getId(),
                entity.getName(),
                entity.getImageUrl(),
                entity.getSortOrder(),
                entity.getIsActive()
        );
    }

    public static ProductResponse toResponse(Product entity) {
        return new ProductResponse(
                entity.getId(),
                entity.getCategory() != null ? entity.getCategory().getId() : null,
                entity.getName(),
                entity.getDescription(),
                entity.getBasePrice(),
                entity.getImageUrl(),
                entity.getImagePublicId(),
                entity.getKcal(),
                entity.getSpicyLevel(),
                entity.getIsActive()
        );
    }

    public static ProductOptionResponse toResponse(ProductOption entity) {
        return new ProductOptionResponse(
                entity.getId(),
                entity.getProduct() != null ? entity.getProduct().getId() : null,
                entity.getGroupName(),
                entity.getName(),
                entity.getExtraPrice()
        );
    }

    public static ProductToppingResponse toResponse(ProductTopping entity) {
        return new ProductToppingResponse(
                entity.getId(),
                entity.getProduct() != null ? entity.getProduct().getId() : null,
                entity.getToppingName(),
                entity.getExtraPrice()
        );
    }

    public static ComboResponse toResponse(Combo entity) {
        return new ComboResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getComboPrice(),
                entity.getImageUrl(),
                entity.getImagePublicId(),
                entity.getStartAt() != null ? entity.getStartAt().toInstant() : null,
                entity.getEndAt() != null ? entity.getEndAt().toInstant() : null,
                entity.getIsActive()
        );
    }

    public static ComboItemResponse toResponse(ComboItem entity) {
        return new ComboItemResponse(
                entity.getId(),
                entity.getCombo() != null ? entity.getCombo().getId() : null,
                entity.getProduct() != null ? entity.getProduct().getId() : null,
                entity.getQuantity(),
                entity.getOptionId()
        );
    }

    public static StoreProductResponse toResponse(StoreProduct entity) {
        return new StoreProductResponse(
                entity.getId(),
                entity.getStore() != null ? entity.getStore().getId() : null,
                entity.getProduct() != null ? entity.getProduct().getId() : null,
                entity.getStorePrice(),
                entity.getIsAvailable(),
                entity.getIsSoldOut()
        );
    }

    public static StoreInventoryResponse toResponse(StoreInventory entity) {
        return new StoreInventoryResponse(
                entity.getId(),
                entity.getStore() != null ? entity.getStore().getId() : null,
                entity.getProduct() != null ? entity.getProduct().getId() : null,
                entity.getQuantityAvailable(),
                entity.getLowStockThreshold(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt() != null ? entity.getUpdatedAt().toInstant() : null
        );
    }
}
