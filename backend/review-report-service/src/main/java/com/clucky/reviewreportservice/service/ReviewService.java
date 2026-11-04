package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.client.OrderServiceClient;
import com.clucky.reviewreportservice.dto.*;
import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.exception.ResourceNotFoundException;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final ReviewRepository reviewRepository;
    private final OrderServiceClient orderServiceClient;

    public ReviewService(ReviewRepository reviewRepository, OrderServiceClient orderServiceClient) {
        this.reviewRepository = reviewRepository;
        this.orderServiceClient = orderServiceClient;
    }

    @Transactional(readOnly = true)
    public ProductReviewSummaryDto getProductReviews(Long productId) {
        List<Review> reviews = reviewRepository.findByProductIdAndStatusOrderByCreatedAtDesc(productId, ReviewStatus.VISIBLE);
        List<ReviewDto> dtoList = reviews.stream().map(this::toDto).toList();

        double avg = reviews.isEmpty() ? 0.0 :
                reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        // Round to 1 decimal place
        avg = Math.round(avg * 10.0) / 10.0;

        return new ProductReviewSummaryDto(productId, avg, (long) reviews.size(), dtoList);
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> getMyReviews(Long customerId) {
        return reviewRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ReviewDto createReview(Long customerId, CreateReviewRequest request) {
        // 1. Kiểm tra đơn hàng đã hoàn thành và đúng của khách hàng hay không
        OrderServiceClient.OrderVerificationDto order = orderServiceClient.getOrderForReview(request.orderId(), customerId);
        if (order == null) {
            throw new ResourceNotFoundException("Đơn hàng #" + request.orderId() + " không tồn tại hoặc không thuộc về bạn!");
        }

        if (!request.orderId().equals(order.id()) || !customerId.equals(order.customerId())
                || order.status() == null || order.productIds() == null) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }

        if (!"COMPLETED".equalsIgnoreCase(order.status())) {
            throw new IllegalArgumentException("Chỉ có thể đánh giá món ăn khi đơn hàng đã ở trạng thái HOÀN THÀNH (COMPLETED)!");
        }

        if (!order.productIds().contains(request.productId())) {
            throw new IllegalArgumentException("Món ăn #" + request.productId() + " không có trong đơn hàng #" + request.orderId() + "!");
        }

        // 2. Kiểm tra xem khách đã đánh giá món này trong đơn này chưa
        if (reviewRepository.existsByCustomerIdAndOrderIdAndProductId(customerId, request.orderId(), request.productId())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        Review review = new Review(customerId, request.productId(), request.orderId(), request.rating(), request.comment());
        Review saved = reviewRepository.save(review);
        log.info("Created review #{} by customer #{} for product #{} (order #{})", saved.getId(), customerId, request.productId(), request.orderId());

        return toDto(saved);
    }

    @Transactional
    public ReviewDto updateReview(Long reviewId, Long customerId, UpdateReviewRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!"));

        if (!review.getCustomerId().equals(customerId)) {
            throw new ForbiddenException("Bạn chỉ có quyền chỉnh sửa đánh giá của chính mình!");
        }

        review.setRating(request.rating());
        review.setComment(request.comment());
        log.info("Updated review #{} by customer #{}", reviewId, customerId);

        return toDto(review);
    }

    @Transactional
    public void deleteReview(Long reviewId, Long customerId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!"));

        if (!review.getCustomerId().equals(customerId)) {
            throw new ForbiddenException("Bạn chỉ có quyền xóa đánh giá của chính mình!");
        }

        reviewRepository.delete(review);
        log.info("Deleted review #{} by customer #{}", reviewId, customerId);
    }

    private ReviewDto toDto(Review review) {
        List<ReviewReplyDto> replyDtos = review.getReplies().stream()
                .map(r -> new ReviewReplyDto(r.getId(), r.getResponderId(), r.getResponderRole(), r.getContent(), r.getCreatedAt()))
                .toList();

        return new ReviewDto(
                review.getId(),
                review.getCustomerId(),
                review.getProductId(),
                review.getOrderId(),
                review.getRating(),
                review.getComment(),
                review.getStatus(),
                review.getCreatedAt(),
                replyDtos
        );
    }
}
