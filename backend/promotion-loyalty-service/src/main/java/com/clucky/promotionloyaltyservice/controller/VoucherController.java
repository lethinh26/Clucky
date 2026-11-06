package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.config.CurrentActor;
import com.clucky.promotionloyaltyservice.dto.Role;
import com.clucky.promotionloyaltyservice.dto.ValidateVoucherRequest;
import com.clucky.promotionloyaltyservice.dto.ValidateVoucherResponse;
import com.clucky.promotionloyaltyservice.dto.VoucherRequest;
import com.clucky.promotionloyaltyservice.dto.VoucherResponse;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
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
        @RequestParam(name = "keyword", required = false) String keyword
    ) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.role() != Role.STORE_MANAGER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        Long effectiveStoreId = storeId;
        if (actor.role() == Role.STORE_MANAGER) {
            if (actor.storeId() == null || (storeId != null && !storeId.equals(actor.storeId()))) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
            effectiveStoreId = actor.storeId();
            scope = VoucherScope.STORE;
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
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.role() != Role.STORE_MANAGER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        VoucherResponse voucher = voucherService.getVoucherById(id);
        if (actor.role() == Role.STORE_MANAGER
                && (actor.storeId() == null || !actor.storeId().equals(voucher.getStoreId()))) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        return ResponseEntity.ok(voucher);
    }

    /**
     * Create a new voucher (Admin / Store Manager).
     * POST /api/promotions/vouchers
     */
    @PostMapping
    public ResponseEntity<VoucherResponse> createVoucher(
        @Valid @RequestBody VoucherRequest request
    ) {
        CurrentActor actor = CurrentActor.require();
        VoucherResponse created = voucherService.createVoucher(
            request,
            actor.userId(),
            actor.role() != null ? actor.role().name() : null,
            actor.storeId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Store proposal endpoint for Store Manager to submit a voucher proposal.
     * Enforces storeId from authenticated actor, scope STORE, and status PENDING_APPROVAL.
     * POST /api/promotions/vouchers/store-proposals
     */
    @PostMapping("/store-proposals")
    public ResponseEntity<VoucherResponse> createStoreProposal(
        @Valid @RequestBody VoucherRequest request
    ) {
        CurrentActor actor = CurrentActor.require();
        VoucherResponse created = voucherService.createStoreProposal(
            request,
            actor.userId(),
            actor.role() != null ? actor.role().name() : null,
            actor.storeId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Admin approves a voucher proposal, transitioning it from PENDING_APPROVAL to ACTIVE.
     * Manager or unauthorized caller is rejected with FORBIDDEN.
     * PUT /api/promotions/vouchers/{id}/approve
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<VoucherResponse> approveVoucher(
        @PathVariable("id") Long id
    ) {
        CurrentActor actor = CurrentActor.require();
        VoucherResponse approved = voucherService.approveVoucher(
            id,
            actor.userId(),
            actor.role() != null ? actor.role().name() : null
        );
        return ResponseEntity.ok(approved);
    }

    /**
     * Update a voucher.
     * PUT /api/promotions/vouchers/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<VoucherResponse> updateVoucher(
        @PathVariable("id") Long id,
        @Valid @RequestBody VoucherRequest request
    ) {
        CurrentActor actor = CurrentActor.require();
        VoucherResponse updated = voucherService.updateVoucher(
            id,
            request,
            actor.userId(),
            actor.role() != null ? actor.role().name() : null,
            actor.storeId()
        );
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete or disable a voucher.
     * DELETE /api/promotions/vouchers/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVoucher(
        @PathVariable("id") Long id
    ) {
        CurrentActor actor = CurrentActor.require();
        voucherService.deleteVoucher(
            id,
            actor.userId(),
            actor.role() != null ? actor.role().name() : null,
            actor.storeId()
        );
        return ResponseEntity.noContent().build();
    }

}
