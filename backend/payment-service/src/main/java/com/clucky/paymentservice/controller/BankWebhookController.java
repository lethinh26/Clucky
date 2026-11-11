package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.BankWebhookPayload;
import com.clucky.paymentservice.service.PaymentReconciliationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class BankWebhookController {
    private final PaymentReconciliationService reconciliationService;

    public BankWebhookController(PaymentReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @PostMapping({
            "/api/payments/webhook/mbbank",
            "/api/payments/webhook/bank",
            "/api/payments/webhook/generic",
            "/api/payments/webhook/vietcombank",
            "/api/payments/webhook/techcombank"
    })
    public ResponseEntity<Map<String, Object>> handleBankWebhook(
            @RequestBody BankWebhookPayload payload
    ) {
        boolean success = reconciliationService.processLateBankWebhook(payload);
        return ResponseEntity.ok(Map.of("success", success));
    }
}
