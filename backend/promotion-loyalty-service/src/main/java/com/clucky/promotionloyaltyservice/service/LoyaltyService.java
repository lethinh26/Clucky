package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.*;
import com.clucky.promotionloyaltyservice.entity.LoyaltyConfig;
import com.clucky.promotionloyaltyservice.entity.MemberPoints;
import com.clucky.promotionloyaltyservice.entity.PointTransaction;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import com.clucky.promotionloyaltyservice.mapper.DomainMapper;
import com.clucky.promotionloyaltyservice.repository.LoyaltyConfigRepository;
import com.clucky.promotionloyaltyservice.repository.MemberPointsRepository;
import com.clucky.promotionloyaltyservice.repository.PointTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
public class LoyaltyService {
    private static final Logger LOG = LoggerFactory.getLogger(LoyaltyService.class);

    private static final BigDecimal DEFAULT_EARN_RATE = new BigDecimal("0.0100");
    private static final BigDecimal DEFAULT_REDEEM_RATE = new BigDecimal("1000.0000");

    private final MemberPointsRepository memberPointsRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final LoyaltyConfigRepository loyaltyConfigRepository;

    public LoyaltyService(
            MemberPointsRepository memberPointsRepository,
            PointTransactionRepository pointTransactionRepository,
            LoyaltyConfigRepository loyaltyConfigRepository
    ) {
        this.memberPointsRepository = memberPointsRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.loyaltyConfigRepository = loyaltyConfigRepository;
    }

    /**
     * Get points, tier, and recent transaction history for the authenticated customer.
     */
    @Transactional(readOnly = true)
    public MyLoyaltyResponse getMyLoyalty(Long customerId) {
        Objects.requireNonNull(customerId, "customerId is required");

        MemberPoints member = memberPointsRepository.findByCustomerId(customerId).orElse(null);
        MemberPointsResponse pointsResponse;
        if (member == null) {
            pointsResponse = new MemberPointsResponse(null, customerId, 0, "MEMBER", Instant.now());
        } else {
            pointsResponse = DomainMapper.toResponse(member);
        }

        List<PointTransaction> transactions = pointTransactionRepository.findTop20ByCustomerIdOrderByCreatedAtDesc(customerId);
        List<PointTransactionResponse> transactionResponses = transactions.stream()
                .map(DomainMapper::toResponse)
                .toList();

        return new MyLoyaltyResponse(pointsResponse, transactionResponses);
    }

    /**
     * Get paginated transaction history for the authenticated customer.
     */
    @Transactional(readOnly = true)
    public PageResponse<PointTransactionResponse> getMyHistory(Long customerId, Pageable pageable) {
        Objects.requireNonNull(customerId, "customerId is required");
        Page<PointTransaction> page = pointTransactionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
        return PageResponse.from(page.map(DomainMapper::toResponse));
    }

    /**
     * Read-only preview calculation of loyalty points (redeem discount and earned points).
     * No state is mutated.
     */
    @Transactional(readOnly = true)
    public LoyaltyPreviewResponse previewLoyalty(LoyaltyPreviewRequest request, Long authCustomerId) {
        Long targetCustomerId = authCustomerId;
        if (request.customerId() != null && !Objects.equals(request.customerId(), authCustomerId)) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        int availablePoints = 0;
        String tier = "MEMBER";
        if (targetCustomerId != null) {
            MemberPoints member = memberPointsRepository.findByCustomerId(targetCustomerId).orElse(null);
            if (member != null) {
                availablePoints = member.getTotalPoints();
                tier = member.getTier();
            }
        }

        LoyaltyConfig config = getActiveConfigEntity();
        int requestedRedeem = request.pointsToRedeem() != null ? Math.max(0, request.pointsToRedeem()) : 0;
        int affordablePoints = request.orderAmount().divide(config.getRedeemRate(), 0, RoundingMode.FLOOR)
                .min(BigDecimal.valueOf(Integer.MAX_VALUE)).intValueExact();
        int pointsUsed = Math.min(Math.min(requestedRedeem, availablePoints), affordablePoints);
        BigDecimal pointsAmount = calculatePointsAmount(pointsUsed, config.getRedeemRate());

        int pointsToEarn = calculateEarnPoints(request.orderAmount(), config.getEarnRate());

        return new LoyaltyPreviewResponse(availablePoints, pointsUsed, pointsAmount, pointsToEarn, tier);
    }

    /**
     * Earn points for a customer (called by internal Order completion or Saga).
     * Idempotent by operationKey. Atomic balance and ledger update.
     */
    @Transactional
    public PointTransactionResponse earnPoints(EarnPointsRequest request) {
        Long customerId = Objects.requireNonNull(request.customerId(), "customerId is required");

        memberPointsRepository.initCustomerPoints(customerId);
        MemberPoints member = memberPointsRepository.findByCustomerIdForUpdate(customerId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        String opKey = resolveOperationKey("EARN", request.operationKey(), request.orderId(), customerId);
        if (opKey != null) {
            var existing = pointTransactionRepository.findByOperationKey(opKey);
            if (existing.isPresent()) {
                LOG.info("event=loyalty_earn_replay_detected operationKey={} customerId={}", opKey, customerId);
                return DomainMapper.toResponse(existing.get());
            }
        }

        int pointsToEarn;
        if (request.points() != null && request.points() > 0) {
            pointsToEarn = request.points();
        } else if (request.orderAmount() != null && request.orderAmount().signum() > 0) {
            LoyaltyConfig config = getActiveConfigEntity();
            pointsToEarn = calculateEarnPoints(request.orderAmount(), config.getEarnRate());
        } else {
            pointsToEarn = 0;
        }

        int newBalance = Math.addExact(member.getTotalPoints(), pointsToEarn);
        member.setTotalPoints(newBalance);
        memberPointsRepository.save(member);

        String reason = request.reason() != null && !request.reason().isBlank()
                ? request.reason()
                : (request.orderId() != null ? "Tích điểm đơn hàng #" + request.orderId() : "Tích điểm thưởng");

        PointTransaction tx = new PointTransaction();
        tx.setCustomerId(customerId);
        tx.setOrderId(request.orderId());
        tx.setChange(pointsToEarn);
        tx.setBalanceAfter(newBalance);
        tx.setType("EARN");
        tx.setOperationKey(opKey);
        tx.setReason(reason);
        pointTransactionRepository.save(tx);

        LOG.info("event=loyalty_points_earned customerId={} change=+{} balanceAfter={} orderId={}",
                customerId, pointsToEarn, newBalance, request.orderId());

        return DomainMapper.toResponse(tx);
    }

    /**
     * Redeem points for a customer order.
     * Idempotent by operationKey. Rejects if balance is insufficient.
     */
    @Transactional
    public PointTransactionResponse redeemPoints(RedeemPointsRequest request) {
        Long customerId = Objects.requireNonNull(request.customerId(), "customerId is required");
        int pointsToRedeem = Objects.requireNonNull(request.points(), "points is required");
        if (pointsToRedeem <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        memberPointsRepository.initCustomerPoints(customerId);
        MemberPoints member = memberPointsRepository.findByCustomerIdForUpdate(customerId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        String opKey = resolveOperationKey("REDEEM", request.operationKey(), request.orderId(), customerId);
        if (opKey != null) {
            var existing = pointTransactionRepository.findByOperationKey(opKey);
            if (existing.isPresent()) {
                LOG.info("event=loyalty_redeem_replay_detected operationKey={} customerId={}", opKey, customerId);
                return DomainMapper.toResponse(existing.get());
            }
        }


        if (member.getTotalPoints() < pointsToRedeem) {
            LOG.warn("event=loyalty_insufficient_points customerId={} available={} requested={}",
                    customerId, member.getTotalPoints(), pointsToRedeem);
            throw new ApiException(ErrorCode.INSUFFICIENT_POINTS);
        }

        int newBalance = member.getTotalPoints() - pointsToRedeem;
        member.setTotalPoints(newBalance);
        memberPointsRepository.save(member);

        String reason = request.reason() != null && !request.reason().isBlank()
                ? request.reason()
                : (request.orderId() != null ? "Đổi " + pointsToRedeem + " điểm cho đơn hàng #" + request.orderId() : "Đổi điểm");

        PointTransaction tx = new PointTransaction();
        tx.setCustomerId(customerId);
        tx.setOrderId(request.orderId());
        tx.setChange(-pointsToRedeem);
        tx.setBalanceAfter(newBalance);
        tx.setType("REDEEM");
        tx.setOperationKey(opKey);
        tx.setReason(reason);
        pointTransactionRepository.save(tx);

        LOG.info("event=loyalty_points_redeemed customerId={} change=-{} balanceAfter={} orderId={}",
                customerId, pointsToRedeem, newBalance, request.orderId());

        return DomainMapper.toResponse(tx);
    }

    /**
     * Release (refund/compensate) previously redeemed points for an order.
     * Prevents duplicate release and prevents releasing points that were never redeemed.
     */
    @Transactional
    public PointTransactionResponse releasePoints(LoyaltyReleaseRequest request) {
        Long customerId = Objects.requireNonNull(request.customerId(), "customerId is required");
        int pointsToRelease = Objects.requireNonNull(request.points(), "points is required");
        if (pointsToRelease <= 0) {
            return null;
        }

        memberPointsRepository.initCustomerPoints(customerId);
        MemberPoints member = memberPointsRepository.findByCustomerIdForUpdate(customerId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        String opKey = resolveOperationKey("RELEASE", request.operationKey(), request.orderId(), customerId);
        if (opKey != null) {
            var existing = pointTransactionRepository.findByOperationKey(opKey);
            if (existing.isPresent()) {
                LOG.info("event=loyalty_release_replay_detected operationKey={} customerId={}", opKey, customerId);
                return DomainMapper.toResponse(existing.get());
            }
        }

        // Validate whether points were actually redeemed for this order
        if (request.orderId() == null || request.orderId() <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        int pointsToRestore = pointsToRelease;
        if (request.orderId() != null) {
            List<PointTransaction> redeems = pointTransactionRepository.findByCustomerIdAndOrderIdAndType(
                    customerId, request.orderId(), "REDEEM");
            int totalRedeemed = redeems.stream().mapToInt(t -> Math.abs(t.getChange())).sum();
            if (totalRedeemed <= 0) {
                LOG.warn("event=loyalty_release_rejected_no_prior_redeem customerId={} orderId={}",
                        customerId, request.orderId());
                return null;
            }

            List<PointTransaction> releases = pointTransactionRepository.findByCustomerIdAndOrderIdAndType(
                    customerId, request.orderId(), "ADJUST");
            int alreadyReleased = releases.stream().filter(t -> t.getChange() > 0).mapToInt(PointTransaction::getChange).sum();
            int remainingToRelease = Math.max(0, totalRedeemed - alreadyReleased);
            pointsToRestore = Math.min(pointsToRelease, remainingToRelease);

            if (pointsToRestore <= 0) {
                LOG.warn("event=loyalty_release_already_exhausted customerId={} orderId={}", customerId, request.orderId());
                return null;
            }
        }


        int newBalance = Math.addExact(member.getTotalPoints(), pointsToRestore);
        member.setTotalPoints(newBalance);
        memberPointsRepository.save(member);

        String reason = request.reason() != null && !request.reason().isBlank()
                ? request.reason()
                : (request.orderId() != null ? "Hoàn lại " + pointsToRestore + " điểm từ đơn hàng #" + request.orderId() : "Hoàn lại điểm");

        PointTransaction tx = new PointTransaction();
        tx.setCustomerId(customerId);
        tx.setOrderId(request.orderId());
        tx.setChange(pointsToRestore);
        tx.setBalanceAfter(newBalance);
        tx.setType("ADJUST");
        tx.setOperationKey(opKey);
        tx.setReason(reason);
        pointTransactionRepository.save(tx);

        LOG.info("event=loyalty_points_released customerId={} change=+{} balanceAfter={} orderId={}",
                customerId, pointsToRestore, newBalance, request.orderId());

        return DomainMapper.toResponse(tx);
    }

    /**
     * Get active loyalty configuration (Admin).
     */
    @Transactional(readOnly = true)
    public LoyaltyConfigResponse getLoyaltyConfig() {
        return DomainMapper.toResponse(getActiveConfigEntity());
    }

    /**
     * Update active loyalty configuration (Admin only).
     * Enforces singleton row id = 1.
     */
    @Transactional
    public LoyaltyConfigResponse updateLoyaltyConfig(UpdateLoyaltyConfigRequest request, Long adminId) {
        if (request.earnRate() == null || request.earnRate().signum() <= 0
                || request.redeemRate() == null || request.redeemRate().signum() <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        LoyaltyConfig config = loyaltyConfigRepository.findById(1L).orElseGet(() -> {
            LoyaltyConfig created = new LoyaltyConfig();
            created.setId(1L);
            return created;
        });

        config.setEarnRate(request.earnRate());
        config.setRedeemRate(request.redeemRate());
        config.setUpdatedBy(adminId);
        loyaltyConfigRepository.save(config);

        LOG.info("event=loyalty_config_updated earnRate={} redeemRate={} updatedBy={}",
                request.earnRate(), request.redeemRate(), adminId);

        return DomainMapper.toResponse(config);
    }

    private LoyaltyConfig getActiveConfigEntity() {
        return loyaltyConfigRepository.findById(1L).orElseGet(() -> {
            LoyaltyConfig fallback = new LoyaltyConfig();
            fallback.setId(1L);
            fallback.setEarnRate(DEFAULT_EARN_RATE);
            fallback.setRedeemRate(DEFAULT_REDEEM_RATE);
            return fallback;
        });
    }

    private int calculateEarnPoints(BigDecimal orderAmount, BigDecimal earnRate) {
        if (orderAmount == null || orderAmount.signum() <= 0 || earnRate == null || earnRate.signum() <= 0) {
            return 0;
        }
        return orderAmount.multiply(earnRate).setScale(0, RoundingMode.FLOOR).intValueExact();
    }

    private BigDecimal calculatePointsAmount(int points, BigDecimal redeemRate) {
        if (points <= 0 || redeemRate == null || redeemRate.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(points).multiply(redeemRate).setScale(0, RoundingMode.FLOOR);
    }

    private String resolveOperationKey(String prefix, String providedKey, Long orderId, Long customerId) {
        if (orderId != null) {
            return prefix + ":cus:" + customerId + ":order:" + orderId;
        }
        if (providedKey != null && !providedKey.isBlank() && providedKey.length() <= 64) {
            return prefix + ":cus:" + customerId + ":" + providedKey.trim();
        }
        throw new ApiException(ErrorCode.VALIDATION_ERROR);
    }
}

