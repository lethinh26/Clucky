package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.BankAccountData.*;
import com.clucky.paymentservice.service.BankAccountService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/bank-config")
@PreAuthorize("hasRole('ADMIN')")
public class BankAccountController {
    private final BankAccountService service;

    public BankAccountController(BankAccountService service) { this.service = service; }

    @GetMapping
    public Overview list() { return service.list(); }

    @GetMapping("/banks")
    public java.util.List<Bank> banks() { return service.banks(); }

    @PostMapping
    public Account create(@Valid @RequestBody Details request,
            @RequestHeader("Idempotency-Key") UUID key) {
        return service.save(null, request, key);
    }

    @PutMapping("/{id}")
    public Account update(@Positive @PathVariable long id, @Valid @RequestBody Details request,
            @RequestHeader("Idempotency-Key") UUID key) {
        return service.save(id, request, key);
    }

    @PutMapping("/stores/{storeId}")
    public Assignment assign(@Positive @PathVariable long storeId, @Valid @RequestBody AssignmentRequest request,
            @RequestHeader("Idempotency-Key") UUID key) {
        return service.assign(storeId, request, key);
    }
}
