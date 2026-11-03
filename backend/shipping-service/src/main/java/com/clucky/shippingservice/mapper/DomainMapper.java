package com.clucky.shippingservice.mapper;

import com.clucky.shippingservice.dto.*;
import com.clucky.shippingservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static ShipmentResponse toResponse(Shipment entity) {
        return new ShipmentResponse(
                entity.getId(),
                entity.getOrderId(),
                entity.getStoreId(),
                entity.getShipperId(),
                entity.getCustomerName(),
                entity.getPhone(),
                entity.getAddress(),
                entity.getFee(),
                entity.getDistanceKm(),
                entity.getStatus(),
                entity.getCodAmount(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static ShipmentStatusHistoryResponse toResponse(ShipmentStatusHistory entity) {
        return new ShipmentStatusHistoryResponse(
                entity.getId(),
                entity.getShipmentId(),
                entity.getStatus(),
                entity.getChangedBy(),
                entity.getNote(),
                entity.getCreatedAt()
        );
    }

    public static ShippingFeeConfigResponse toResponse(ShippingFeeConfig entity) {
        return new ShippingFeeConfigResponse(
                entity.getId(),
                entity.getStoreId(),
                entity.getBaseFee(),
                entity.getPerKmFee(),
                entity.getFreeFromAmount(),
                entity.getAreaNote()
        );
    }
}
