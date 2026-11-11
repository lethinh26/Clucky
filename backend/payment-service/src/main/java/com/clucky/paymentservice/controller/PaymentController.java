package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.CounterCollectionRequest;
import com.clucky.paymentservice.dto.CounterPaymentReceiptResponse;
import com.clucky.paymentservice.dto.ShiftSummaryResponse;
import com.clucky.paymentservice.dto.VoidReceiptRequest;
import com.clucky.paymentservice.service.CounterPaymentService;
import com.clucky.paymentservice.service.PaymentFlow;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentFlow service;
    private final CounterPaymentService counterService;

    public PaymentController(PaymentFlow service, CounterPaymentService counterService) {
        this.service = service;
        this.counterService = counterService;
    }

    @PostMapping("/{orderId}/bank-transfer")
    public PaymentFlow.Summary initialize(@PathVariable @Positive long orderId) { return service.initialize(orderId); }

    @GetMapping("/{orderId}")
    public PaymentFlow.Summary read(@PathVariable @Positive long orderId) { return service.get(orderId); }

    @PostMapping("/counter-collection")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public CounterPaymentReceiptResponse collect(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CounterCollectionRequest request
    ) {
        return counterService.collect(request, idempotencyKey);
    }

    @PostMapping("/receipts/{id}/void")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public CounterPaymentReceiptResponse voidReceipt(
            @PathVariable("id") @Positive Long id,
            @RequestBody(required = false) VoidReceiptRequest request
    ) {
        return counterService.voidReceipt(id, request);
    }

    @PostMapping("/receipts/{id}/print")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public CounterPaymentReceiptResponse printReceipt(
            @PathVariable("id") @Positive Long id
    ) {
        return counterService.printReceipt(id);
    }

    @GetMapping("/shift-summary")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public ShiftSummaryResponse getShiftSummary(
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam(value = "date", required = false) String date
    ) {
        return counterService.getShiftSummary(storeId, date);
    }
}

