package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.dto.Role;
import com.clucky.cartorderservice.entity.OrderItem;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.repository.OrderItemRepository;
import com.clucky.cartorderservice.repository.OrderRepository;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
public class OrderVerificationController {
    private final OrderRepository orders;
    private final OrderItemRepository items;

    public OrderVerificationController(OrderRepository orders, OrderItemRepository items) {
        this.orders = orders;
        this.items = items;
    }

    @GetMapping("/api/internal/orders/{orderId}/verification")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional(readOnly = true)
    public OrderVerificationResponse verify(@PathVariable @Positive Long orderId,
            @RequestParam @Positive Long customerId) {
        Long actorId = CurrentActor.require().userId();
        if (!actorId.equals(customerId)) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        var order = orders.findByIdAndCustomerId(orderId, actorId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        List<Long> productIds = items.findByOrderId(orderId).stream()
                .filter(item -> "PRODUCT".equals(item.getItemType()))
                .map(OrderItem::getProductId).filter(Objects::nonNull).distinct().toList();
        return new OrderVerificationResponse(order.getId(), order.getOrderCode(), order.getCustomerId(),
                order.getStatus(), productIds, order.getStoreId());
    }

    public record OrderVerificationResponse(Long id, String orderCode, Long customerId,
            String status, List<Long> productIds, Long storeId) {
        public OrderVerificationResponse(Long id, String orderCode, Long customerId,
                String status, List<Long> productIds) {
            this(id, orderCode, customerId, status, productIds, null);
        }
    }

    @GetMapping("/api/internal/orders/{orderId}/store")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    @Transactional(readOnly = true)
    public OrderStoreResponse getStore(@PathVariable @Positive Long orderId) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        if (actor.role() != Role.ADMIN && (actor.storeId() == null || actor.storeId() <= 0)) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        var order = (actor.role() == Role.ADMIN ? orders.findById(orderId)
                : orders.findByIdAndStoreId(orderId, actor.storeId()))
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        return new OrderStoreResponse(order.getId(), order.getStoreId());
    }

    public record OrderStoreResponse(Long orderId, Long storeId) {}
}
