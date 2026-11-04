package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.OrderResponse;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;

public class OrderServiceTemplate {
    protected final OrderRepository repository;

    public OrderServiceTemplate(OrderRepository repository) {
        this.repository = repository;
    }

    public OrderResponse get(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
