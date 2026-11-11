package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.client.OrderServiceClient;
import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.dto.*;
import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewReply;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.exception.ResourceNotFoundException;
import com.clucky.reviewreportservice.repository.ReviewReplyRepository;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final ReviewRepository reviewRepository;
    private final ReviewReplyRepository reviewReplyRepository;
    private final ReviewAuditOutbox auditOutbox;
    private final OrderServiceClient orderServiceClient;
    private final ReviewIdempotencyStore idempotencyStore;

    public ReviewService(ReviewRepository reviewRepository, OrderServiceClient orderServiceClient,
            ReviewReplyRepository reviewReplyRepository, ReviewAuditOutbox auditOutbox) {
        this(reviewRepository, orderServiceClient, reviewReplyRepository, auditOutbox, null);
    }

    @Autowired
    public ReviewService(ReviewRepository reviewRepository, OrderServiceClient orderServiceClient,
            ReviewReplyRepository reviewReplyRepository, ReviewAuditOutbox auditOutbox,
            @Autowired(required = false) ReviewIdempotencyStore idempotencyStore) {
        this.reviewRepository = reviewRepository;
        this.orderServiceClient = orderServiceClient;
        this.reviewReplyRepository = reviewReplyRepository;
        this.auditOutbox = auditOutbox;
        this.idempotencyStore = idempotencyStore;
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
        return reviewRepository.findByCustomerIdAndStatusNotOrderByCreatedAtDesc(customerId, ReviewStatus.DELETED).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ReviewDto createReview(Long customerId, CreateReviewRequest request) {
        return createReview(customerId, request, null);
    }

    @Transactional
    public ReviewDto createReview(Long customerId, CreateReviewRequest request, String idempotencyKey) {
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        String trimmedComment = normalizeReviewComment(request.comment());

        if (normalizedKey != null && idempotencyStore != null) {
            Map<String, Object> hashPayload = new LinkedHashMap<>();
            hashPayload.put("orderId", request.orderId());
            hashPayload.put("productId", request.productId());
            hashPayload.put("rating", request.rating());
            hashPayload.put("comment", trimmedComment);
            String requestHash = idempotencyStore.hashRequest(hashPayload);
            Optional<ReviewDto> replayed = idempotencyStore.reserveOrReplay(
                    "CREATE_REVIEW", customerId, request.orderId(), normalizedKey, requestHash, ReviewDto.class);
            if (replayed.isPresent()) {
                return replayed.get();
            }
        }

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

        Review review = new Review(customerId, request.productId(), request.orderId(), request.rating(), trimmedComment);
        if (order.storeId() != null && order.storeId() > 0) {
            review.setStoreId(order.storeId());
        }
        Review saved = reviewRepository.save(review);
        log.info("Created review #{} by customer #{} for product #{} (order #{})", saved.getId(), customerId, request.productId(), request.orderId());

        ReviewDto result = toDto(saved);
        completeIdempotency("CREATE_REVIEW", customerId, normalizedKey, 201, result);
        return result;
    }

    @Transactional
    public ReviewDto updateReview(Long reviewId, Long customerId, UpdateReviewRequest request) {
        return updateReview(reviewId, customerId, request, null);
    }

    @Transactional
    public ReviewDto updateReview(Long reviewId, Long customerId, UpdateReviewRequest request, String idempotencyKey) {
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        String trimmedComment = normalizeReviewComment(request.comment());

        if (normalizedKey != null && idempotencyStore != null) {
            Map<String, Object> hashPayload = new LinkedHashMap<>();
            hashPayload.put("reviewId", reviewId);
            hashPayload.put("rating", request.rating());
            hashPayload.put("comment", trimmedComment);
            hashPayload.put("version", request.version());
            String requestHash = idempotencyStore.hashRequest(hashPayload);
            Optional<ReviewDto> replayed = idempotencyStore.reserveOrReplay(
                    "UPDATE_REVIEW", customerId, reviewId, normalizedKey, requestHash, ReviewDto.class);
            if (replayed.isPresent()) {
                return replayed.get();
            }
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!"));

        if (!review.getCustomerId().equals(customerId)) {
            throw new ForbiddenException("Bạn chỉ có quyền chỉnh sửa đánh giá của chính mình!");
        }
        if (review.getStatus() == ReviewStatus.DELETED) {
            throw new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!");
        }
        if (review.getStatus() == ReviewStatus.HIDDEN) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (request.version() != null && !Objects.equals(request.version(), review.getVersion())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        review.setRating(request.rating());
        review.setComment(trimmedComment);
        review.setUpdatedAt(OffsetDateTime.now());
        log.info("Updated review #{} by customer #{}", reviewId, customerId);

        ReviewDto result = toDto(review);
        completeIdempotency("UPDATE_REVIEW", customerId, normalizedKey, 200, result);
        return result;
    }

    @Transactional
    public void deleteReview(Long reviewId, Long customerId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!"));

        if (!review.getCustomerId().equals(customerId)) {
            throw new ForbiddenException("Bạn chỉ có quyền xóa đánh giá của chính mình!");
        }
        if (review.getStatus() == ReviewStatus.DELETED) {
            throw new ResourceNotFoundException("Đánh giá #" + reviewId + " không tồn tại!");
        }
        if (review.getStatus() == ReviewStatus.HIDDEN) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        reviewRepository.delete(review);
        log.info("Deleted review #{} by customer #{}", reviewId, customerId);
    }

    @Transactional
    public PageResponse<ReviewDto> listModerationReviews(
            Long requestedStoreId,
            ReviewStatus status,
            Integer rating,
            Long productId,
            Boolean hasReply,
            String q,
            int page,
            int size
    ) {
        CurrentActor actor = CurrentActor.require();
        Long effectiveStoreId = authorizeModerationScope(actor, requestedStoreId);
        resolveMissingStoreIds();

        if (actor.role() != Role.ADMIN && status == ReviewStatus.DELETED) {
            return new PageResponse<>(List.of(), page, size, 0L, 0);
        }

        Specification<Review> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (effectiveStoreId != null) {
                predicates.add(cb.equal(root.get("storeId"), effectiveStoreId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else if (actor.role() != Role.ADMIN) {
                predicates.add(cb.notEqual(root.get("status"), ReviewStatus.DELETED));
            }
            if (rating != null) {
                predicates.add(cb.equal(root.get("rating"), rating));
            }
            if (productId != null) {
                predicates.add(cb.equal(root.get("productId"), productId));
            }
            if (hasReply != null) {
                predicates.add(Boolean.TRUE.equals(hasReply)
                        ? cb.isNotEmpty(root.get("replies"))
                        : cb.isEmpty(root.get("replies")));
            }
            if (q != null && !q.isBlank()) {
                String trimmedQuery = q.trim();
                String pattern = "%" + escapeLike(trimmedQuery.toLowerCase(Locale.ROOT)) + "%";
                Predicate commentLike = cb.like(cb.lower(root.get("comment")), pattern, '\\');
                Long numericId = parsePositiveLong(trimmedQuery);
                if (numericId != null) {
                    predicates.add(cb.or(
                            commentLike,
                            cb.equal(root.get("id"), numericId),
                            cb.equal(root.get("orderId"), numericId),
                            cb.equal(root.get("productId"), numericId),
                            cb.equal(root.get("customerId"), numericId)));
                } else {
                    predicates.add(commentLike);
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<Review> reviewPage = reviewRepository.findAll(spec, pageable);
        List<Review> pageContent = reviewPage.getContent();
        if (pageContent.isEmpty()) {
            return new PageResponse<>(List.of(), reviewPage.getNumber(), reviewPage.getSize(),
                    reviewPage.getTotalElements(), reviewPage.getTotalPages());
        }

        List<Long> reviewIds = pageContent.stream().map(Review::getId).toList();
        Map<Long, List<ReviewReplyDto>> repliesByReviewId = reviewReplyRepository
                .findByReviewIdInOrderByCreatedAtAsc(reviewIds).stream()
                .collect(Collectors.groupingBy(
                        reply -> reply.getReview().getId(),
                        Collectors.mapping(
                                r -> new ReviewReplyDto(r.getId(), r.getResponderId(), r.getResponderRole(),
                                        r.getContent(), r.getCreatedAt()),
                                Collectors.toList())));

        List<ReviewDto> dtos = pageContent.stream()
                .map(review -> toDto(review, repliesByReviewId.getOrDefault(review.getId(), List.of())))
                .toList();

        return new PageResponse<>(dtos, reviewPage.getNumber(), reviewPage.getSize(),
                reviewPage.getTotalElements(), reviewPage.getTotalPages());
    }

    @Transactional
    public ReviewModerationSummaryDto getModerationSummary(Long requestedStoreId) {
        CurrentActor actor = CurrentActor.require();
        Long effectiveStoreId = authorizeModerationScope(actor, requestedStoreId);
        resolveMissingStoreIds();

        long visibleCount;
        long hiddenCount;
        long deletedCount;
        long unrepliedVisibleCount;
        Double rawAverage;

        if (effectiveStoreId == null) {
            visibleCount = reviewRepository.countByStatus(ReviewStatus.VISIBLE);
            hiddenCount = reviewRepository.countByStatus(ReviewStatus.HIDDEN);
            deletedCount = reviewRepository.countByStatus(ReviewStatus.DELETED);
            unrepliedVisibleCount = reviewRepository.countUnrepliedVisible();
            rawAverage = reviewRepository.averageRatingByStatus(ReviewStatus.VISIBLE);
        } else {
            visibleCount = reviewRepository.countByStoreIdAndStatus(effectiveStoreId, ReviewStatus.VISIBLE);
            hiddenCount = reviewRepository.countByStoreIdAndStatus(effectiveStoreId, ReviewStatus.HIDDEN);
            deletedCount = actor.role() == Role.ADMIN
                    ? reviewRepository.countByStoreIdAndStatus(effectiveStoreId, ReviewStatus.DELETED)
                    : 0L;
            unrepliedVisibleCount = reviewRepository.countUnrepliedVisibleByStoreId(effectiveStoreId);
            rawAverage = reviewRepository.averageRatingByStoreIdAndStatus(effectiveStoreId, ReviewStatus.VISIBLE);
        }

        double averageRating = rawAverage == null ? 0.0 : Math.round(rawAverage * 10.0) / 10.0;
        long totalReviews = visibleCount + hiddenCount;
        return new ReviewModerationSummaryDto(totalReviews, visibleCount, averageRating,
                unrepliedVisibleCount, hiddenCount, deletedCount);
    }

    @Transactional
    public ReviewReplyDto addReply(Long reviewId, CreateReplyRequest request) {
        return addReply(reviewId, request, null);
    }

    @Transactional
    public ReviewReplyDto addReply(Long reviewId, CreateReplyRequest request, String idempotencyKey) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ForbiddenException("Access denied");
        }
        requireActorStoreIfScoped(actor);
        String trimmedContent = normalizeReplyContent(request.content());
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);

        if (normalizedKey != null && idempotencyStore != null) {
            Map<String, Object> hashPayload = new LinkedHashMap<>();
            hashPayload.put("reviewId", reviewId);
            hashPayload.put("content", trimmedContent);
            String requestHash = idempotencyStore.hashRequest(hashPayload);
            Optional<ReviewReplyDto> replayed = idempotencyStore.reserveOrReplay(
                    "REPLY_REVIEW", actor.userId(), reviewId, normalizedKey, requestHash, ReviewReplyDto.class);
            if (replayed.isPresent()) {
                return replayed.get();
            }
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        Long storeId = requireReviewStore(review, actor);
        if (review.getStatus() == ReviewStatus.DELETED) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        ReviewReply reply = reviewReplyRepository.save(
                new ReviewReply(review, actor.userId(), actor.role().name(), trimmedContent));
        auditOutbox.record(actor, storeId, "REPLY_REVIEW", reviewId,
                Map.of(), Map.of("replyId", reply.getId()));
        ReviewReplyDto result = new ReviewReplyDto(reply.getId(), reply.getResponderId(), reply.getResponderRole(),
                reply.getContent(), reply.getCreatedAt());
        completeIdempotency("REPLY_REVIEW", actor.userId(), normalizedKey, 201, result);
        return result;
    }

    @Transactional
    public ReviewDto hideReview(Long reviewId, HideReviewRequest request) {
        return hideReview(reviewId, request, null);
    }

    @Transactional
    public ReviewDto hideReview(Long reviewId, HideReviewRequest request, String idempotencyKey) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ForbiddenException("Access denied");
        }
        requireActorStoreIfScoped(actor);
        String normalizedReason = normalizeReason(request == null ? null : request.reason());
        Long expectedVersion = request == null ? null : request.version();
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);

        if (normalizedKey != null && idempotencyStore != null) {
            Map<String, Object> hashPayload = new LinkedHashMap<>();
            hashPayload.put("reviewId", reviewId);
            hashPayload.put("reason", normalizedReason);
            hashPayload.put("version", expectedVersion);
            String requestHash = idempotencyStore.hashRequest(hashPayload);
            Optional<ReviewDto> replayed = idempotencyStore.reserveOrReplay(
                    "HIDE_REVIEW", actor.userId(), reviewId, normalizedKey, requestHash, ReviewDto.class);
            if (replayed.isPresent()) {
                return replayed.get();
            }
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        Long storeId = requireReviewStore(review, actor);
        if (expectedVersion != null && !Objects.equals(expectedVersion, review.getVersion())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (review.getStatus() == ReviewStatus.DELETED) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (review.getStatus() != ReviewStatus.HIDDEN) {
            ReviewStatus previousStatus = review.getStatus();
            review.setStatus(ReviewStatus.HIDDEN);
            review.setUpdatedAt(OffsetDateTime.now());
            auditOutbox.record(actor, storeId, "HIDE_REVIEW", reviewId,
                    Map.of("status", previousStatus.name()), Map.of("status", ReviewStatus.HIDDEN.name()));
        }
        ReviewDto result = toDto(review);
        completeIdempotency("HIDE_REVIEW", actor.userId(), normalizedKey, 200, result);
        return result;
    }

    @Transactional
    public ReviewDto softDeleteReview(Long reviewId) {
        return softDeleteReview(reviewId, null, null);
    }

    @Transactional
    public ReviewDto softDeleteReview(Long reviewId, SoftDeleteReviewRequest request, String idempotencyKey) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) {
            throw new ForbiddenException("Access denied");
        }
        String normalizedReason = normalizeReason(request == null ? null : request.reason());
        Long expectedVersion = request == null ? null : request.version();
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);

        if (normalizedKey != null && idempotencyStore != null) {
            Map<String, Object> hashPayload = new LinkedHashMap<>();
            hashPayload.put("reviewId", reviewId);
            hashPayload.put("reason", normalizedReason);
            hashPayload.put("version", expectedVersion);
            String requestHash = idempotencyStore.hashRequest(hashPayload);
            Optional<ReviewDto> replayed = idempotencyStore.reserveOrReplay(
                    "SOFT_DELETE_REVIEW", actor.userId(), reviewId, normalizedKey, requestHash, ReviewDto.class);
            if (replayed.isPresent()) {
                return replayed.get();
            }
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        Long storeId = requireReviewStore(review, actor);
        if (expectedVersion != null && !Objects.equals(expectedVersion, review.getVersion())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (review.getStatus() != ReviewStatus.DELETED) {
            ReviewStatus previousStatus = review.getStatus();
            OffsetDateTime now = OffsetDateTime.now();
            review.setStatus(ReviewStatus.DELETED);
            review.setDeletedAt(now);
            review.setDeletedBy(actor.userId());
            review.setUpdatedAt(now);
            auditOutbox.record(actor, storeId, "SOFT_DELETE_REVIEW", reviewId,
                    Map.of("status", previousStatus.name()), Map.of("status", ReviewStatus.DELETED.name()));
        }
        ReviewDto result = toDto(review);
        completeIdempotency("SOFT_DELETE_REVIEW", actor.userId(), normalizedKey, 200, result);
        return result;
    }

    private Long authorizeModerationScope(CurrentActor actor, Long requestedStoreId) {
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ForbiddenException("Access denied");
        }
        if (actor.role() == Role.ADMIN) {
            return requestedStoreId;
        }
        requireActorStoreIfScoped(actor);
        if (requestedStoreId != null && !requestedStoreId.equals(actor.storeId())) {
            throw new ForbiddenException("Access denied");
        }
        return actor.storeId();
    }

    private void requireActorStoreIfScoped(CurrentActor actor) {
        if (actor.role() != Role.ADMIN && (actor.storeId() == null || actor.storeId() <= 0)) {
            throw new ForbiddenException("Access denied");
        }
    }

    private void resolveMissingStoreIds() {
        List<Review> unresolved = reviewRepository.findByStoreIdIsNull();
        if (unresolved == null || unresolved.isEmpty()) {
            return;
        }
        for (Review item : unresolved) {
            try {
                Long resolvedStoreId = orderServiceClient.getOrderStoreId(item.getOrderId());
                if (resolvedStoreId != null && resolvedStoreId > 0) {
                    item.setStoreId(resolvedStoreId);
                }
            } catch (ApiException failure) {
                if (failure.getCode() != ErrorCode.RESOURCE_NOT_FOUND && failure.getCode() != ErrorCode.FORBIDDEN) {
                    throw failure;
                }
            }
        }
    }

    private Long requireReviewStore(Review review, CurrentActor actor) {
        requireActorStoreIfScoped(actor);
        Long storeId = review.getStoreId();
        boolean needsPersist = false;
        if (storeId == null || storeId <= 0) {
            storeId = orderServiceClient.getOrderStoreId(review.getOrderId());
            if (storeId == null || storeId <= 0) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }
            needsPersist = true;
        }
        if (actor.role() != Role.ADMIN && !storeId.equals(actor.storeId())) {
            throw new ForbiddenException("Access denied");
        }
        if (needsPersist) {
            review.setStoreId(storeId);
        }
        return storeId;
    }

    private void completeIdempotency(String operation, Long actorId, String idempotencyKey, int status, Object result) {
        if (idempotencyKey != null && idempotencyStore != null) {
            idempotencyStore.complete(operation, actorId, idempotencyKey, status, result);
        }
    }

    private String normalizeIdempotencyKey(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || !trimmed.matches("[A-Za-z0-9._:-]{1,128}")) {
            throw new IllegalArgumentException("Idempotency-Key không hợp lệ");
        }
        return trimmed;
    }

    private String normalizeReviewComment(String comment) {
        if (comment == null) {
            throw new IllegalArgumentException("Nội dung đánh giá không được để trống");
        }
        String trimmed = comment.trim();
        if (trimmed.length() < 5 || trimmed.length() > 1000) {
            throw new IllegalArgumentException("Nội dung đánh giá từ 5 đến 1000 ký tự");
        }
        return trimmed;
    }

    private String normalizeReplyContent(String content) {
        if (content == null) {
            throw new IllegalArgumentException("Nội dung phản hồi không được để trống!");
        }
        String trimmed = content.trim();
        if (trimmed.isEmpty() || trimmed.length() > 1000) {
            throw new IllegalArgumentException("Nội dung phản hồi từ 1 đến 1000 ký tự!");
        }
        return trimmed;
    }

    private String normalizeReason(String reason) {
        if (reason == null) {
            return "";
        }
        String trimmed = reason.trim();
        if (trimmed.length() > 500) {
            throw new IllegalArgumentException("Lý do tối đa 500 ký tự!");
        }
        return trimmed;
    }

    private String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private Long parsePositiveLong(String value) {
        try {
            long parsed = Long.parseLong(value);
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private ReviewDto toDto(Review review) {
        List<ReviewReplyDto> replyDtos = review.getReplies().stream()
                .map(r -> new ReviewReplyDto(r.getId(), r.getResponderId(), r.getResponderRole(), r.getContent(), r.getCreatedAt()))
                .toList();
        return toDto(review, replyDtos);
    }

    private ReviewDto toDto(Review review, List<ReviewReplyDto> replyDtos) {
        return new ReviewDto(
                review.getId(),
                review.getCustomerId(),
                review.getProductId(),
                review.getOrderId(),
                review.getStoreId(),
                review.getRating(),
                review.getComment(),
                review.getStatus(),
                review.getVersion(),
                review.getCreatedAt(),
                review.getUpdatedAt(),
                review.getDeletedAt(),
                replyDtos
        );
    }
}
