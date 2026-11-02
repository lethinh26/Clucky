package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.dto.OrderResponse;
import com.clucky.cartorderservice.service.OrderServiceTemplate;
import jakarta.validation.constraints.Positive;

public class OrderControllerTemplate {
    private final OrderServiceTemplate service;

    public OrderControllerTemplate(OrderServiceTemplate service) {
        this.service = service;
    }

    public OrderResponse get(@Positive Long id) {
        return service.get(id);
    }
}
