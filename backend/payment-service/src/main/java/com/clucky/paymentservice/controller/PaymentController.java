package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.service.PaymentFlow;
import jakarta.validation.constraints.Positive;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentFlow service;
    public PaymentController(PaymentFlow service) { this.service = service; }
    @PostMapping("/{orderId}/bank-transfer")
    public PaymentFlow.Summary initialize(@PathVariable @Positive long orderId) { return service.initialize(orderId); }
    @GetMapping("/{orderId}")
    public PaymentFlow.Summary read(@PathVariable @Positive long orderId) { return service.get(orderId); }
}
