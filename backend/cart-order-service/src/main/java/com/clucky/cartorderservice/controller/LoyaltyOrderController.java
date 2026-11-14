package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/loyalty/orders")
public class LoyaltyOrderController {
    private final OrderRepository orders;
    private final com.clucky.cartorderservice.service.VoucherCheckoutRecovery recovery;

    public LoyaltyOrderController(OrderRepository orders, com.clucky.cartorderservice.service.VoucherCheckoutRecovery recovery) {
        this.orders = orders; this.recovery = recovery;
    }

    public record OrderState(Long orderId, Long customerId, String status) {}

    @GetMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public OrderState get(@PathVariable Long id) {
        if (id == null || id <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        recovery.lock(id);
        var order = orders.findById(id).orElse(null);
        if (order == null) return new OrderState(id, null, "MISSING");
        // Loyalty interprets CANCELLED as "release reserved points/vouchers". A failed
        // delivery or a COD-only simulated completion does not settle real money.
        // This projection deliberately keeps those simulated orders out of rewards,
        // including the periodic reconciliation path that queries this endpoint.
        boolean virtualCodCompletion = "DELIVERY".equals(order.getType())
                && "COD".equals(order.getPaymentMethod())
                && "COMPLETED".equals(order.getStatus())
                && !java.util.Set.of("PAID", "COLLECTED").contains(order.getPaymentStatus());
        String loyaltyState = "DELIVERY_FAILED".equals(order.getStatus()) || virtualCodCompletion
                ? "CANCELLED" : order.getStatus();
        return new OrderState(id, order.getCustomerId(), loyaltyState);
    }
}
