package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.service.LocalPaymentSimulationService;
import com.clucky.paymentservice.service.PaymentFlow;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@ConditionalOnProperty(name = "payment.local-simulation.enabled", havingValue = "true")
public class LocalPaymentSimulationController {
    private final LocalPaymentSimulationService service;

    public LocalPaymentSimulationController(LocalPaymentSimulationService service) {
        this.service = service;
    }

    @PostMapping("/{orderId}/simulate-bank-transfer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentFlow.Summary confirm(@PathVariable @Positive long orderId) {
        return service.confirm(orderId);
    }
}
