package com.clucky.shippingservice.controller;

import com.clucky.shippingservice.dto.ShipmentResponse;
import com.clucky.shippingservice.service.ShipmentServiceTemplate;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shipping/shipments")
public class ShipmentControllerTemplate {
    private final ShipmentServiceTemplate service;

    public ShipmentControllerTemplate(ShipmentServiceTemplate service) {
        this.service = service;
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','STAFF','STORE_MANAGER','ADMIN')")
    public ShipmentResponse get(@PathVariable @Positive Long orderId) {
        return service.get(orderId);
    }
}
