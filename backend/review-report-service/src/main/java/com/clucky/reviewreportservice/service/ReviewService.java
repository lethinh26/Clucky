package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.client.OrderServiceClient;
import com.clucky.reviewreportservice.dto.*;
import com.clucky.reviewreportservice.entity.AuditLog;
import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewReply;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.exception.ResourceNotFoundException;
import com.clucky.reviewreportservice.repository.AuditLogRepository;
import com.clucky.reviewreportservice.repository.ReviewReplyRepository;
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
    private final ReviewReplyRepository reviewReplyRepository;
    private final AuditLogRepository auditLogRepository;
    private final OrderServiceClient orderServiceClient;

    public ReviewService(
            ReviewRepository reviewRepository,
            ReviewReplyRepository reviewReplyRepository,
            AuditLogRepository auditLogRepository,
            OrderServiceClient orderServiceClient
    ) {
        this.reviewRepository = reviewRepository;
        this.reviewReplyRepository = reviewReplyRepository;
        this.auditLogRepository = auditLogRepository;
        this.orderServiceClient = orderServiceClient;
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

        if (!"COMPLETED".equalsIgnoreCase(order.status())) {
            throw new IllegalArgumentException("Chỉ có thể đánh giá món ăn khi đơn hàng đã ở trạng thái HOÀN THÀNH (COMPLETED)!");
        }

        if (order.productIds() != null && !order.productIds().isEmpty() && !order.productIds().contains(request.productId())) {
            throw new IllegalArgumentException("Món ăn #" + request.productId() + " không có trong đơn hàng #" + request.orderId() + "!");
        }

        if (reviewRepository.existsByCustomerIdAndOrderIdAndProductId(customerId, request.orderId(), request.productId())) {
            throw new IllegalArgumentException("Bạn đã đánh giá món ăn này cho đơn hàng #" + request.orderId() + " rồi!");
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

    /**
     * BE-41: Thêm phản hồi cho đánh giá (Staff/Store Manager đúng quán, Admin toàn hệ thống)
     */
    @Transactional
    public ReviewReplyDto addReply(Long reviewId, Long responderId, String responderRole, Long storeId, CreateReplyRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!"));

        // Phân quyền theo quán nếu là STAFF hoặc STORE_MANAGER
        if (!"ADMIN".equalsIgnoreCase(responderRole)) {
            Long orderStoreId = orderServiceClient.getOrderStoreId(review.getOrderId());
            if (orderStoreId == null) {
                throw new ForbiddenException("Không thể xác định cửa hàng của đơn hàng hoặc dịch vụ đơn hàng chưa sẵn sàng!");
            }
            if (storeId == null || !storeId.equals(orderStoreId)) {
                throw new ForbiddenException("Bạn chỉ có quyền phản hồi đánh giá thuộc cửa hàng của mình (Quán #" + orderStoreId + ")!");
            }
        }

        ReviewReply reply = new ReviewReply(review, responderId, responderRole, request.content().trim());
        review.addReply(reply);
        ReviewReply savedReply = reviewReplyRepository.save(reply);

        // Lưu audit log
        auditLogRepository.save(new AuditLog(
                responderId,
                responderRole,
                storeId,
                "REPLY_REVIEW",
                "REVIEW",
                reviewId,
                "Nhân sự #" + responderId + " (" + responderRole + ") đã phản hồi đánh giá #" + reviewId
        ));

        log.info("Added reply #{} to review #{} by responder #{} ({})", savedReply.getId(), reviewId, responderId, responderRole);

        return new ReviewReplyDto(
                savedReply.getId(),
                savedReply.getResponderId(),
                savedReply.getResponderRole(),
                savedReply.getContent(),
                savedReply.getCreatedAt()
        );
    }

    /**
     * BE-41: Ẩn đánh giá vi phạm (Store Manager đúng quán, Admin toàn hệ thống. Staff bị chặn)
     */
    @Transactional
    public ReviewDto hideReview(Long reviewId, Long actorId, String actorRole, Long storeId, HideReviewRequest request) {
        if ("STAFF".equalsIgnoreCase(actorRole)) {
            throw new ForbiddenException("Nhân viên (Staff) không có quyền ẩn đánh giá!");
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!"));

        // Phân quyền theo quán nếu là STORE_MANAGER
        if (!"ADMIN".equalsIgnoreCase(actorRole)) {
            Long orderStoreId = orderServiceClient.getOrderStoreId(review.getOrderId());
            if (orderStoreId == null) {
                throw new ForbiddenException("Không thể xác định cửa hàng của đơn hàng hoặc dịch vụ đơn hàng chưa sẵn sàng!");
            }
            if (storeId == null || !storeId.equals(orderStoreId)) {
                throw new ForbiddenException("Bạn chỉ có quyền ẩn đánh giá thuộc cửa hàng của mình (Quán #" + orderStoreId + ")!");
            }
        }

        if (review.getStatus() != ReviewStatus.HIDDEN) {
            review.setStatus(ReviewStatus.HIDDEN);
            reviewRepository.save(review);

            String reason = (request != null && request.reason() != null && !request.reason().isBlank())
                    ? request.reason().trim()
                    : "Đánh giá vi phạm chính sách cộng đồng";

            // Lưu audit log
            auditLogRepository.save(new AuditLog(
                    actorId,
                    actorRole,
                    storeId,
                    "HIDE_REVIEW",
                    "REVIEW",
                    reviewId,
                    "Ẩn đánh giá #" + reviewId + " bởi " + actorRole + " #" + actorId + ". Lý do: " + reason
            ));

            log.info("Review #{} has been hidden by {} #{}", reviewId, actorRole, actorId);
        }

        return toDto(review);
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
