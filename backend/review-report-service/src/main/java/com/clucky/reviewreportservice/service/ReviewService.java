package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.client.OrderServiceClient;
import com.clucky.reviewreportservice.dto.*;
import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.exception.ResourceNotFoundException;
import com.clucky.reviewreportservice.entity.ReviewReply;
import com.clucky.reviewreportservice.repository.ReviewReplyRepository;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final ReviewRepository reviewRepository;
    private final ReviewReplyRepository reviewReplyRepository;
    private final ReviewAuditOutbox auditOutbox;
    private final OrderServiceClient orderServiceClient;

    public ReviewService(ReviewRepository reviewRepository, OrderServiceClient orderServiceClient,
            ReviewReplyRepository reviewReplyRepository, ReviewAuditOutbox auditOutbox) {
        this.reviewRepository = reviewRepository;
        this.orderServiceClient = orderServiceClient;
        this.reviewReplyRepository = reviewReplyRepository;
        this.auditOutbox = auditOutbox;
    }

    @Transactional(readOnly = true)
    public ProductReviewSummaryDto getProductReviews(Long productId) {
        List<Review> reviews = reviewRepository.findByProductIdAndStatusOrderByCreatedAtDesc(productId, ReviewStatus.VISIBLE);
        List<ReviewDto> dtoList = reviews.stream().map(this::toDto).toList();

        double avg = reviews.isEmpty() ? 0.0 :
                reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
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

    @Transactional
    public ReviewReplyDto addReply(Long reviewId, CreateReplyRequest request) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ForbiddenException("Access denied");
        }
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        Long storeId = requireReviewStore(review, actor);
        ReviewReply reply = reviewReplyRepository.save(
                new ReviewReply(review, actor.userId(), actor.role().name(), request.content().trim()));
        auditOutbox.record(actor, storeId, "REPLY_REVIEW", reviewId,
                Map.of(), Map.of("replyId", reply.getId()));
        return new ReviewReplyDto(reply.getId(), reply.getResponderId(), reply.getResponderRole(),
                reply.getContent(), reply.getCreatedAt());
    }

    @Transactional
    public ReviewDto hideReview(Long reviewId, HideReviewRequest request) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ForbiddenException("Access denied");
        }
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        Long storeId = requireReviewStore(review, actor);
        if (review.getStatus() != ReviewStatus.HIDDEN) {
            ReviewStatus previousStatus = review.getStatus();
            review.setStatus(ReviewStatus.HIDDEN);
            auditOutbox.record(actor, storeId, "HIDE_REVIEW", reviewId,
                    Map.of("status", previousStatus.name()), Map.of("status", ReviewStatus.HIDDEN.name()));
        }
        return toDto(review);
    }

    private Long requireReviewStore(Review review, CurrentActor actor) {
        Long storeId = orderServiceClient.getOrderStoreId(review.getOrderId());
        if (storeId == null || storeId <= 0) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
        if (actor.role() != Role.ADMIN && !storeId.equals(actor.storeId())) {
            throw new ForbiddenException("Access denied");
        }
        return storeId;
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
