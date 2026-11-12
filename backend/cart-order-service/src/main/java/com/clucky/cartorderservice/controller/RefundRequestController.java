package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.dto.*;
import com.clucky.cartorderservice.service.RefundRequestService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/refund-requests")
public class RefundRequestController {
    private final RefundRequestService refundRequestService;

    public RefundRequestController(RefundRequestService refundRequestService) {
        this.refundRequestService = refundRequestService;
    }

    @PostMapping
    public ResponseEntity<RefundRequestResponse> createRefundRequest(@Valid @RequestBody CreateRefundRequest request) {
        var result = refundRequestService.createRefundRequest(request);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .cacheControl(CacheControl.noStore()).body(result.refund());
    }

    @GetMapping
    public ResponseEntity<PageResponse<RefundRequestResponse>> getRefundRequests(
            @RequestParam(value = "customerId", required = false) Long customerId,
            @RequestParam(value = "orderId", required = false) Long orderId,
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int pageNum = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 200);
        Pageable pageable = PageRequest.of(pageNum, pageSize, Sort.by(Sort.Direction.DESC, "id"));

        PageResponse<RefundRequestResponse> response = refundRequestService.getRefundRequests(customerId, storeId, status, orderId, pageable);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RefundRequestResponse> getRefundRequestById(@PathVariable("id") @Positive Long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(refundRequestService.getRefundRequestById(id));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<RefundRequestResponse> approveRefundRequest(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody(required = false) ReviewRefundRequest request) {
        RefundRequestResponse response = refundRequestService.approveRefundRequest(id, request);
        return ResponseEntity.status(response.paymentOperation() == null ? HttpStatus.OK : HttpStatus.ACCEPTED)
                .cacheControl(CacheControl.noStore()).body(response);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<RefundRequestResponse> rejectRefundRequest(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody ReviewRefundRequest request) {
        RefundRequestResponse response = refundRequestService.rejectRefundRequest(id, request);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }

    @PutMapping("/{id}/claim-processing")
    public ResponseEntity<RefundRequestResponse> claimProcessing(@PathVariable("id") @Positive Long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(refundRequestService.claimProcessing(id));
    }

    @PutMapping("/{id}/request-bank-details")
    public ResponseEntity<RefundRequestResponse> requestBankDetails(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody BankDetailsInvalidRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(refundRequestService.requestBankDetails(id, request));
    }

    @PutMapping("/{id}/bank-details")
    public ResponseEntity<RefundRequestResponse> updateBankDetails(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody UpdateBankDetailsRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(refundRequestService.updateBankDetails(id, request));
    }

    @PostMapping("/{id}/evidence")
    @io.swagger.v3.oas.annotations.Operation(summary = "Upload private refund evidence: JPEG or PNG, up to 5 MiB")
    public ResponseEntity<RefundRequestResponse> uploadEvidence(
            @PathVariable("id") @Positive Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(refundRequestService.uploadEvidence(id, file));
    }

    @GetMapping("/{id}/evidence")
    public ResponseEntity<EvidenceAccessResponse> getEvidenceAccess(@PathVariable("id") @Positive Long id) {
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore()).body(refundRequestService.getEvidenceAccess(id));
    }

    @PutMapping("/{id}/confirm-refund")
    public ResponseEntity<RefundRequestResponse> confirmRefund(@PathVariable("id") @Positive Long id) {
        var response = refundRequestService.confirmRefund(id);
        return ResponseEntity.status("REFUNDED".equals(response.status()) ? HttpStatus.OK : HttpStatus.ACCEPTED)
                .cacheControl(CacheControl.noStore()).body(response);
    }
}
