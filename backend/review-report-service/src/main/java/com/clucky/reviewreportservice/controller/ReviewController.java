package com.clucky.reviewreportservice.controller;

import com.clucky.reviewreportservice.config.SecurityContextHelper;
import com.clucky.reviewreportservice.dto.*;
import com.clucky.reviewreportservice.service.ReviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<ProductReviewSummaryDto> getProductReviews(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getProductReviews(productId));
    }

    /**
     * GET /api/reviews/my
     * Quyền: CUS (Khách hàng) - Lấy lịch sử đánh giá của chính mình
     */
    @GetMapping("/my")
    public ResponseEntity<List<ReviewDto>> getMyReviews(HttpServletRequest request) {
        SecurityContextHelper.requireRole(request, "CUSTOMER", "STAFF", "STORE_MANAGER", "ADMIN");
        Long customerId = SecurityContextHelper.getCurrentUserId(request);
        return ResponseEntity.ok(reviewService.getMyReviews(customerId));
    }

    /**
     * POST /api/reviews
     * Quyền: CUS (Khách hàng) - Tạo đánh giá cho món thuộc đơn COMPLETED
     */
    @PostMapping
    public ResponseEntity<ReviewDto> createReview(
            @Valid @RequestBody CreateReviewRequest createRequest,
            HttpServletRequest request
    ) {
        SecurityContextHelper.requireRole(request, "CUSTOMER", "STAFF", "STORE_MANAGER", "ADMIN");
        Long customerId = SecurityContextHelper.getCurrentUserId(request);
        ReviewDto created = reviewService.createReview(customerId, createRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/reviews/{id}
     * Quyền: CUS (Khách hàng) - Sửa đánh giá của chính mình
     */
    @PutMapping("/{id}")
    public ResponseEntity<ReviewDto> updateReview(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReviewRequest updateRequest,
            HttpServletRequest request
    ) {
        SecurityContextHelper.requireRole(request, "CUSTOMER", "STAFF", "STORE_MANAGER", "ADMIN");
        Long customerId = SecurityContextHelper.getCurrentUserId(request);
        ReviewDto updated = reviewService.updateReview(id, customerId, updateRequest);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/reviews/{id}
     * Quyền: CUS (Khách hàng) - Xóa đánh giá của chính mình
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        SecurityContextHelper.requireRole(request, "CUSTOMER", "STAFF", "STORE_MANAGER", "ADMIN");
        Long customerId = SecurityContextHelper.getCurrentUserId(request);
        reviewService.deleteReview(id, customerId);
        return ResponseEntity.noContent().build();
    }

    /**
     * BE-41: POST /api/reviews/{id}/replies
     * Quyền: STF/MGR đúng quán, ADM toàn hệ thống
     */
    @PostMapping("/{id}/replies")
    public ResponseEntity<ReviewReplyDto> replyReview(
            @PathVariable Long id,
            @Valid @RequestBody CreateReplyRequest replyRequest,
            HttpServletRequest request
    ) {
        SecurityContextHelper.requireRole(request, "STAFF", "STORE_MANAGER", "ADMIN");
        Long responderId = SecurityContextHelper.getCurrentUserId(request);
        String responderRole = SecurityContextHelper.getCurrentUserRole(request);
        Long storeId = SecurityContextHelper.getCurrentStoreId(request);

        ReviewReplyDto replyDto = reviewService.addReply(id, responderId, responderRole, storeId, replyRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(replyDto);
    }

    /**
     * BE-41: PUT /api/reviews/{id}/hide
     * Quyền: MGR đúng quán hoặc ADM (STAFF bị chặn)
     */
    @PutMapping("/{id}/hide")
    public ResponseEntity<ReviewDto> hideReview(
            @PathVariable Long id,
            @RequestBody(required = false) HideReviewRequest hideRequest,
            HttpServletRequest request
    ) {
        SecurityContextHelper.requireRole(request, "STORE_MANAGER", "ADMIN");
        Long actorId = SecurityContextHelper.getCurrentUserId(request);
        String actorRole = SecurityContextHelper.getCurrentUserRole(request);
        Long storeId = SecurityContextHelper.getCurrentStoreId(request);

        ReviewDto reviewDto = reviewService.hideReview(id, actorId, actorRole, storeId, hideRequest);
        return ResponseEntity.ok(reviewDto);
    }
}
