package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.dto.ValidateVoucherRequest;
import com.clucky.promotionloyaltyservice.dto.ValidateVoucherResponse;
import com.clucky.promotionloyaltyservice.dto.VoucherRequest;
import com.clucky.promotionloyaltyservice.dto.VoucherResponse;
import com.clucky.promotionloyaltyservice.model.VoucherScope;
import com.clucky.promotionloyaltyservice.model.VoucherStatus;
import com.clucky.promotionloyaltyservice.service.VoucherService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/promotions/vouchers")
public class VoucherController {

    private final VoucherService voucherService;

    public VoucherController(VoucherService voucherService) {
        this.voucherService = voucherService;
    }

    /**
     * Validate a voucher for an order (called by customer app or internal services during checkout).
     * POST /api/promotions/vouchers/validate
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidateVoucherResponse> validateVoucher(@Valid @RequestBody ValidateVoucherRequest request) {
        ValidateVoucherResponse response = voucherService.validateVoucher(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get list of currently active and valid vouchers for customers.
     * GET /api/promotions/vouchers/available?storeId=...
     */
    @GetMapping("/available")
    public ResponseEntity<List<VoucherResponse>> getAvailableVouchers(@RequestParam(name = "storeId", required = false) Long storeId) {
        List<VoucherResponse> vouchers = voucherService.getAvailableVouchers(storeId);
        return ResponseEntity.ok(vouchers);
    }

    /**
     * Query vouchers with filters (Admin and Store Manager views).
     * GET /api/promotions/vouchers
     */
    @GetMapping
    public ResponseEntity<List<VoucherResponse>> getVouchers(
        @RequestParam(name = "scope", required = false) VoucherScope scope,
        @RequestParam(name = "storeId", required = false) Long storeId,
        @RequestParam(name = "status", required = false) VoucherStatus status,
        @RequestParam(name = "keyword", required = false) String keyword,
        @RequestHeader(name = "X-User-Role", required = false) String actorRole,
        @RequestHeader(name = "X-Store-Id", required = false) Long actorStoreId
    ) {
        // Enforce storeId restriction if caller is a Store Manager
        Long effectiveStoreId = storeId;
        if ("STORE_MANAGER".equalsIgnoreCase(actorRole)) {
            effectiveStoreId = actorStoreId;
        }

        List<VoucherResponse> vouchers = voucherService.getVouchers(scope, effectiveStoreId, status, keyword);
        return ResponseEntity.ok(vouchers);
    }

    /**
     * Get voucher details by ID.
     * GET /api/promotions/vouchers/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<VoucherResponse> getVoucherById(@PathVariable("id") Long id) {
        VoucherResponse voucher = voucherService.getVoucherById(id);
        return ResponseEntity.ok(voucher);
    }

    /**
     * Create a new voucher (Admin / Store Manager).
     * POST /api/promotions/vouchers
     */
    @PostMapping
    public ResponseEntity<VoucherResponse> createVoucher(
        @Valid @RequestBody VoucherRequest request,
        @RequestHeader(name = "X-User-Id", required = false) Long actorId,
        @RequestHeader(name = "X-User-Role", required = false) String actorRole,
        @RequestHeader(name = "X-Store-Id", required = false) Long actorStoreId
    ) {
        VoucherResponse created = voucherService.createVoucher(request, actorId, actorRole, actorStoreId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update a voucher.
     * PUT /api/promotions/vouchers/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<VoucherResponse> updateVoucher(
        @PathVariable("id") Long id,
        @Valid @RequestBody VoucherRequest request,
        @RequestHeader(name = "X-User-Id", required = false) Long actorId,
        @RequestHeader(name = "X-User-Role", required = false) String actorRole,
        @RequestHeader(name = "X-Store-Id", required = false) Long actorStoreId
    ) {
        VoucherResponse updated = voucherService.updateVoucher(id, request, actorId, actorRole, actorStoreId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete or disable a voucher.
     * DELETE /api/promotions/vouchers/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVoucher(
        @PathVariable("id") Long id,
        @RequestHeader(name = "X-User-Id", required = false) Long actorId,
        @RequestHeader(name = "X-User-Role", required = false) String actorRole,
        @RequestHeader(name = "X-Store-Id", required = false) Long actorStoreId
    ) {
        voucherService.deleteVoucher(id, actorId, actorRole, actorStoreId);
        return ResponseEntity.noContent().build();
    }
}

