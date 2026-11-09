package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.repository.OrderRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/internal/loyalty/orders")
public class LoyaltyOrderController {
    private final OrderRepository orders;
    public LoyaltyOrderController(OrderRepository orders) { this.orders = orders; }
    public record State(long customerId, String status) {}
    @GetMapping("/{id}")
    public State state(@PathVariable Long id) {
        return orders.findById(id).map(order -> new State(order.getCustomerId(), order.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
