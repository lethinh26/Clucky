package com.clucky.reviewreportservice.controller;

import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.dto.CreateReviewRequest;
import com.clucky.reviewreportservice.dto.ProductReviewSummaryDto;
import com.clucky.reviewreportservice.dto.ReviewDto;
import com.clucky.reviewreportservice.dto.UpdateReviewRequest;
import com.clucky.reviewreportservice.service.ReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
     * POST /api/reviews
     * Quyền: CUS (Khách hàng) - Tạo đánh giá cho món thuộc đơn COMPLETED
     */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ReviewDto> createReview(
            @Valid @RequestBody CreateReviewRequest createRequest
    ) {
        Long customerId = CurrentActor.require().userId();
        ReviewDto created = reviewService.createReview(customerId, createRequest);
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
        ReviewDto updated = reviewService.updateReview(id, customerId, updateRequest);
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
}
