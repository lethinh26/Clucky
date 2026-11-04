package com.clucky.shippingservice.service;

import com.clucky.shippingservice.dto.ShipmentResponse;
import com.clucky.shippingservice.repository.ShipmentRepository;
import com.clucky.shippingservice.exception.ApiException;
import com.clucky.shippingservice.exception.ErrorCode;

public class ShipmentServiceTemplate {
    protected final ShipmentRepository repository;

    public ShipmentServiceTemplate(ShipmentRepository repository) {
        this.repository = repository;
    }

    public ShipmentResponse get(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
