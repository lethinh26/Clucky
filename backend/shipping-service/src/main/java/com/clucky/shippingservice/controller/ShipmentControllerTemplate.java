package com.clucky.shippingservice.controller;

import com.clucky.shippingservice.dto.ShipmentResponse;
import com.clucky.shippingservice.service.ShipmentServiceTemplate;
import jakarta.validation.constraints.Positive;

public class ShipmentControllerTemplate {
    private final ShipmentServiceTemplate service;

    public ShipmentControllerTemplate(ShipmentServiceTemplate service) {
        this.service = service;
    }

    public ShipmentResponse get(@Positive Long id) {
        return service.get(id);
    }
}
