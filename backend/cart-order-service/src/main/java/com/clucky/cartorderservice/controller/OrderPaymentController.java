package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.service.OrderPaymentService;
import jakarta.validation.constraints.Positive;
import org.springframework.web.bind.annotation.*;

@RestController
public class OrderPaymentController {
    private final OrderPaymentService service;
    public OrderPaymentController(OrderPaymentService service) { this.service = service; }

    @PostMapping("/api/orders/{id}/payment-session")
    public OrderPaymentService.Session open(@PathVariable @Positive long id) { return service.open(id); }

    @GetMapping("/api/orders/{id}/payment-session")
    public OrderPaymentService.Session preview(@PathVariable @Positive long id) { return service.preview(id); }

    @GetMapping("/api/orders/{id}/payment-context")
    public OrderPaymentService.Context context(@PathVariable @Positive long id) { return service.context(id); }

}
