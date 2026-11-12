package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.EligibleRefundQueryResponse;
import com.clucky.paymentservice.dto.ReserveRefundRequest;
import com.clucky.paymentservice.dto.ReserveRefundResponse;
import com.clucky.paymentservice.service.PaymentRefundService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/payments/internal")
public class InternalPaymentController {

    private final PaymentRefundService refundService;

    public InternalPaymentController(PaymentRefundService refundService) {
        this.refundService = refundService;
    }

    @GetMapping("/orders/{orderId}/eligible-refund")
    public ResponseEntity<EligibleRefundQueryResponse> getEligibleRefund(
            @PathVariable Long orderId,
            @RequestParam(required = false) BigDecimal orderAmount) {
        return ResponseEntity.ok(refundService.getEligibleRefund(orderId, orderAmount));
    }

    @PostMapping("/refund-reservations")
    public ResponseEntity<ReserveRefundResponse> reserveRefund(@Valid @RequestBody ReserveRefundRequest request) {
        return ResponseEntity.ok(refundService.reserveRefund(request));
    }

    @GetMapping("/refund-reservations/{refundRequestId}")
    public ReserveRefundResponse reservation(@PathVariable Long refundRequestId) {
        return refundService.reservation(refundRequestId);
    }

    @PutMapping("/refund-reservations/{refundRequestId}/confirm")
    public ResponseEntity<Void> confirmRefund(@PathVariable Long refundRequestId,
            @Valid @RequestBody com.clucky.paymentservice.dto.ConfirmRefundRequest request) {
        refundService.confirmRefund(refundRequestId, request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/refund-reservations/{refundRequestId}/release")
    public ResponseEntity<Void> releaseRefund(@PathVariable Long refundRequestId) {
        refundService.releaseRefund(refundRequestId);
        return ResponseEntity.noContent().build();
    }
}
