package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.cart.CartDto;
import com.clucky.cartorderservice.dto.*;
import com.clucky.cartorderservice.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;
    private final com.clucky.cartorderservice.service.RefundRequestService refundRequestService;

    public OrderController(OrderService orderService, com.clucky.cartorderservice.service.RefundRequestService refundRequestService) {
        this.orderService = orderService;
        this.refundRequestService = refundRequestService;
    }

    @PostMapping("/preview")
    public ResponseEntity<OrderPreviewResponse> preview(
            @Valid @RequestBody(required = false) OrderPreviewRequest request,
            HttpServletRequest httpRequest
    ) {
        OrderPreviewRequest req = request != null ? request : new OrderPreviewRequest(
                null, "DELIVERY", null, 0, null, null, null, null
        );
        OrderPreviewResponse response = orderService.previewOrder(req, httpRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    public ResponseEntity<PageResponse<OrderResponse>> getMyOrders(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int pageNum = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 200);
        Pageable pageable = PageRequest.of(pageNum, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        PageResponse<OrderResponse> response = orderService.getMyOrders(status, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getOrders(
            @RequestParam(value = "customerId", required = false) Long customerId,
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "orderCode", required = false) String orderCode,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int pageNum = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 200);
        Pageable pageable = PageRequest.of(pageNum, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        PageResponse<OrderResponse> response = orderService.getOrders(customerId, storeId, status, orderCode, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable("id") @Positive Long id) {
        return ResponseEntity.ok(orderService.getOrderDetails(id));
    }

    @GetMapping("/code/{orderCode}")
    public ResponseEntity<OrderResponse> getOrderByCode(@PathVariable("orderCode") String orderCode) {
        return ResponseEntity.ok(orderService.getOrderByCode(orderCode));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        OrderResponse response = orderService.updateStatus(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            @PathVariable("id") @Positive Long id,
            @RequestBody(required = false) CancelOrderRequest request) {
        OrderResponse response = orderService.cancelOrder(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<OrderResponse> rejectOrder(@PathVariable("id") @Positive Long id,
            @Valid @RequestBody CancelOrderRequest request) {
        return ResponseEntity.ok(orderService.rejectOrder(id, request));
    }

    @PostMapping("/{id}/refund-requests")
    public ResponseEntity<RefundRequestResponse> createRefundRequestForOrder(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody CreateRefundRequest request) {
        CreateRefundRequest effective = new CreateRefundRequest(
                id, request.reason(), request.bankBin(), request.bankName(),
                request.bankAccountNo(), request.bankAccountName()
        );
        var result = refundRequestService.createRefundRequest(effective);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .cacheControl(CacheControl.noStore()).body(result.refund());
    }
}
