package com.clucky.reviewreportservice.controller;

import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.dto.CreateReplyRequest;
import com.clucky.reviewreportservice.dto.CreateReviewRequest;
import com.clucky.reviewreportservice.dto.HideReviewRequest;
import com.clucky.reviewreportservice.dto.PageResponse;
import com.clucky.reviewreportservice.dto.ProductReviewSummaryDto;
import com.clucky.reviewreportservice.dto.ReviewDto;
import com.clucky.reviewreportservice.dto.ReviewModerationSummaryDto;
import com.clucky.reviewreportservice.dto.ReviewReplyDto;
import com.clucky.reviewreportservice.dto.SoftDeleteReviewRequest;
import com.clucky.reviewreportservice.dto.UpdateReviewRequest;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.service.ReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * GET /api/reviews/products/{productId}
     * Quyền: PUB (Công khai) - Lấy danh sách đánh giá hiển thị (VISIBLE) của món ăn
     */
    @GetMapping("/products/{productId}")
    public ResponseEntity<ProductReviewSummaryDto> getProductReviews(@PathVariable @Positive Long productId) {
        return ResponseEntity.ok(reviewService.getProductReviews(productId));
    }

    /**
     * GET /api/reviews/my
     * Quyền: CUS (Khách hàng) - Lấy lịch sử đánh giá của chính mình
     */
    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<ReviewDto>> getMyReviews() {
        Long customerId = CurrentActor.require().userId();
        return ResponseEntity.ok(reviewService.getMyReviews(customerId));
    }

    /**
     * GET /api/reviews/moderation
     * Quyền: STAFF/STORE_MANAGER (theo storeId xác minh), ADMIN (toàn hệ thống hoặc lọc storeId)
     */
    @GetMapping("/moderation")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<PageResponse<ReviewDto>> listModerationReviews(
            @RequestParam(required = false) @Positive Long storeId,
            @RequestParam(required = false) ReviewStatus status,
            @RequestParam(required = false) @Min(1) @Max(5) Integer rating,
            @RequestParam(required = false) @Positive Long productId,
            @RequestParam(required = false) Boolean hasReply,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return ResponseEntity.ok(reviewService.listModerationReviews(
                storeId, status, rating, productId, hasReply, q, page, size));
    }

    /**
     * GET /api/reviews/moderation/summary
     * Quyền: STAFF/STORE_MANAGER (theo storeId xác minh), ADMIN (toàn hệ thống hoặc lọc storeId)
     */
    @GetMapping("/moderation/summary")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<ReviewModerationSummaryDto> getModerationSummary(
            @RequestParam(required = false) @Positive Long storeId
    ) {
        return ResponseEntity.ok(reviewService.getModerationSummary(storeId));
    }

    /**
     * POST /api/reviews
     * Quyền: CUS (Khách hàng) - Tạo đánh giá cho món thuộc đơn COMPLETED
     */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ReviewDto> createReview(
            @Valid @RequestBody CreateReviewRequest createRequest
    ) {
        Long customerId = CurrentActor.require().userId();
        String idempotencyKey = resolveIdempotencyKeyHeader();
        ReviewDto created = idempotencyKey == null
                ? reviewService.createReview(customerId, createRequest)
                : reviewService.createReview(customerId, createRequest, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/reviews/{id}
     * Quyền: CUS (Khách hàng) - Sửa đánh giá của chính mình
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ReviewDto> updateReview(
            @PathVariable @Positive Long id,
            @Valid @RequestBody UpdateReviewRequest updateRequest
    ) {
        Long customerId = CurrentActor.require().userId();
        String idempotencyKey = resolveIdempotencyKeyHeader();
        ReviewDto updated = idempotencyKey == null
                ? reviewService.updateReview(id, customerId, updateRequest)
                : reviewService.updateReview(id, customerId, updateRequest, idempotencyKey);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/reviews/{id}
     * Quyền: CUS (Khách hàng) - Xóa đánh giá của chính mình
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Void> deleteReview(
            @PathVariable @Positive Long id
    ) {
        Long customerId = CurrentActor.require().userId();
        reviewService.deleteReview(id, customerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/replies")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<ReviewReplyDto> replyReview(@PathVariable @Positive Long id,
            @Valid @RequestBody CreateReplyRequest request) {
        String idempotencyKey = resolveIdempotencyKeyHeader();
        ReviewReplyDto created = idempotencyKey == null
                ? reviewService.addReply(id, request)
                : reviewService.addReply(id, request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}/hide")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<ReviewDto> hideReview(@PathVariable @Positive Long id,
            @Valid @RequestBody(required = false) HideReviewRequest request) {
        String idempotencyKey = resolveIdempotencyKeyHeader();
        ReviewDto hidden = idempotencyKey == null
                ? reviewService.hideReview(id, request)
                : reviewService.hideReview(id, request, idempotencyKey);
        return ResponseEntity.ok(hidden);
    }

    @DeleteMapping("/{id}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReviewDto> softDeleteReview(
            @PathVariable @Positive Long id,
            @RequestParam(required = false) @Min(0) Long version,
            @Valid @RequestBody(required = false) SoftDeleteReviewRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        if (version != null && request != null && request.version() != null && !version.equals(request.version())) {
            throw new IllegalArgumentException("Phiên bản đánh giá không khớp");
        }
        Long effectiveVersion = request != null && request.version() != null ? request.version() : version;
        SoftDeleteReviewRequest merged = (request != null || effectiveVersion != null)
                ? new SoftDeleteReviewRequest(request == null ? null : request.reason(), effectiveVersion)
                : null;
        return ResponseEntity.ok(reviewService.softDeleteReview(
                id, merged, normalizeIdempotencyKeyHeader(idempotencyKey)));
    }

    private String resolveIdempotencyKeyHeader() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            return normalizeIdempotencyKeyHeader(servletAttributes.getRequest().getHeader("Idempotency-Key"));
        }
        return null;
    }

    private String normalizeIdempotencyKeyHeader(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || !trimmed.matches("[A-Za-z0-9._:-]{1,128}")) {
            throw new IllegalArgumentException("Idempotency-Key không hợp lệ");
        }
        return trimmed;
    }
}
