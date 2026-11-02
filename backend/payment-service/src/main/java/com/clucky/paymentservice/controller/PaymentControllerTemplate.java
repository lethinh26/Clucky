package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.PaymentResponse;
import com.clucky.paymentservice.service.PaymentServiceTemplate;
import jakarta.validation.constraints.Positive;

public class PaymentControllerTemplate {
    private final PaymentServiceTemplate service;

    public PaymentControllerTemplate(PaymentServiceTemplate service) {
        this.service = service;
    }

    public PaymentResponse get(@Positive Long id) {
        return service.get(id);
    }
}
