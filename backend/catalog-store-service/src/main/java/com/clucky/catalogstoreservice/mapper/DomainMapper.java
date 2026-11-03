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
                entity.getStatus(),
                entity.getDeliveryArea(),
                entity.getCreatedAt()
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
                entity.getCategoryId(),
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
                entity.getProductId(),
                entity.getGroupName(),
                entity.getName(),
                entity.getExtraPrice()
        );
    }

    public static ProductToppingResponse toResponse(ProductTopping entity) {
        return new ProductToppingResponse(
                entity.getId(),
                entity.getProductId(),
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
                entity.getStartAt(),
                entity.getEndAt(),
                entity.getIsActive()
        );
    }

    public static ComboItemResponse toResponse(ComboItem entity) {
        return new ComboItemResponse(
                entity.getId(),
                entity.getComboId(),
                entity.getProductId(),
                entity.getQuantity(),
                entity.getOptionId()
        );
    }

    public static StoreProductResponse toResponse(StoreProduct entity) {
        return new StoreProductResponse(
                entity.getId(),
                entity.getStoreId(),
                entity.getProductId(),
                entity.getStorePrice(),
                entity.getIsAvailable(),
                entity.getIsSoldOut()
        );
    }

    public static StoreInventoryResponse toResponse(StoreInventory entity) {
        return new StoreInventoryResponse(
                entity.getId(),
                entity.getStoreId(),
                entity.getProductId(),
                entity.getQuantityAvailable(),
                entity.getLowStockThreshold(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt()
        );
    }
}
