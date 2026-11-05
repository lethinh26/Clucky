package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.config.CurrentActor;
import com.clucky.promotionloyaltyservice.dto.*;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import com.clucky.promotionloyaltyservice.service.LoyaltyService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loyalty")
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    public LoyaltyController(LoyaltyService loyaltyService) {
        this.loyaltyService = loyaltyService;
    }

    /**
     * Get points, tier, and recent transaction history for the authenticated customer.
     * GET /api/loyalty/me
     */
    @GetMapping("/me")
    public ResponseEntity<MyLoyaltyResponse> getMyLoyalty() {
        CurrentActor actor = CurrentActor.require();
        MyLoyaltyResponse response = loyaltyService.getMyLoyalty(actor.userId());
        return ResponseEntity.ok(response);
    }

    /**
     * Get paginated transaction history for the authenticated customer.
     * GET /api/loyalty/history?page=0&size=20
     */
    @GetMapping("/history")
    public ResponseEntity<PageResponse<PointTransactionResponse>> getMyHistory(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        CurrentActor actor = CurrentActor.require();
        PageResponse<PointTransactionResponse> response = loyaltyService.getMyHistory(
                actor.userId(), PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)))
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Read-only preview calculation of loyalty discount and points to earn.
     * POST /api/loyalty/preview
     */
    @PostMapping("/preview")
    public ResponseEntity<LoyaltyPreviewResponse> previewLoyalty(@Valid @RequestBody LoyaltyPreviewRequest request) {
        Long authCustomerId = null;
        try {
            authCustomerId = CurrentActor.require().userId();
        } catch (Exception ignored) {
            // Guest or unauthenticated internal call
        }
        LoyaltyPreviewResponse response = loyaltyService.previewLoyalty(request, authCustomerId);
        return ResponseEntity.ok(response);
    }

    /**
     * Internal endpoint: Earn points upon order completion.
     * Blocked for CUSTOMER role.
     * POST /api/loyalty/earn
     */
    @PostMapping("/earn")
    public ResponseEntity<PointTransactionResponse> earnPoints(@Valid @RequestBody EarnPointsRequest request) {
        rejectCustomerActor();
        PointTransactionResponse response = loyaltyService.earnPoints(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Internal endpoint: Redeem points during order checkout.
     * Blocked for CUSTOMER role.
     * POST /api/loyalty/redeem
     */
    @PostMapping("/redeem")
    public ResponseEntity<PointTransactionResponse> redeemPoints(@Valid @RequestBody RedeemPointsRequest request) {
        rejectCustomerActor();
        PointTransactionResponse response = loyaltyService.redeemPoints(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Internal endpoint: Compensate / release points on order cancellation or payment failure.
     * Blocked for CUSTOMER role.
     * POST /api/loyalty/release
     */
    @PostMapping("/release")
    public ResponseEntity<PointTransactionResponse> releasePoints(@Valid @RequestBody LoyaltyReleaseRequest request) {
        rejectCustomerActor();
        PointTransactionResponse response = loyaltyService.releasePoints(request);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Admin endpoint: View loyalty configuration (rates).
     * GET /api/loyalty/config
     */
    @GetMapping("/config")
    public ResponseEntity<LoyaltyConfigResponse> getLoyaltyConfig() {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        LoyaltyConfigResponse response = loyaltyService.getLoyaltyConfig();
        return ResponseEntity.ok(response);
    }

    /**
     * Admin endpoint: Update loyalty configuration (rates).
     * PUT /api/loyalty/config
     */
    @PutMapping("/config")
    public ResponseEntity<LoyaltyConfigResponse> updateLoyaltyConfig(@Valid @RequestBody UpdateLoyaltyConfigRequest request) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        LoyaltyConfigResponse response = loyaltyService.updateLoyaltyConfig(request, actor.userId());
        return ResponseEntity.ok(response);
    }

    private void rejectCustomerActor() {
        try {
            CurrentActor actor = CurrentActor.require();
            if (actor.role() == Role.CUSTOMER) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception ignored) {
            // S2S internal call without customer JWT
        }
    }
}

