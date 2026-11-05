package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.dto.CreateRefundRequest;
import com.clucky.cartorderservice.dto.PageResponse;
import com.clucky.cartorderservice.dto.RefundRequestResponse;
import com.clucky.cartorderservice.service.RefundRequestService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/refund-requests")
public class RefundRequestController {
    private final RefundRequestService refundRequestService;

    public RefundRequestController(RefundRequestService refundRequestService) {
        this.refundRequestService = refundRequestService;
    }

    @PostMapping
    public ResponseEntity<RefundRequestResponse> createRefundRequest(@Valid @RequestBody CreateRefundRequest request) {
        RefundRequestResponse response = refundRequestService.createRefundRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<RefundRequestResponse>> getRefundRequests(
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int pageNum = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 200);
        Pageable pageable = PageRequest.of(pageNum, pageSize, Sort.by(Sort.Direction.DESC, "id"));

        PageResponse<RefundRequestResponse> response = refundRequestService.getRefundRequests(storeId, status, pageable);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<RefundRequestResponse> approveRefundRequest(@PathVariable("id") @Positive Long id) {
        RefundRequestResponse response = refundRequestService.approveRefundRequest(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<RefundRequestResponse> rejectRefundRequest(@PathVariable("id") @Positive Long id) {
        RefundRequestResponse response = refundRequestService.rejectRefundRequest(id);
        return ResponseEntity.ok(response);
    }
}
