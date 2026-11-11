package com.clucky.paymentservice.service;

import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.*;
import com.clucky.paymentservice.entity.CounterPaymentReceipt;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.clucky.paymentservice.mapper.DomainMapper;
import com.clucky.paymentservice.repository.CounterPaymentReceiptRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CounterPaymentService {
    private static final Logger LOG = LoggerFactory.getLogger(CounterPaymentService.class);

    private final CounterPaymentReceiptRepository receiptRepository;
    private final PaymentFlow flow;
    private final DiscoveryClient discovery;
    private final RestClient restClient;
    private final ObjectMapper mapper;
    private final StringRedisTemplate redis;

    public CounterPaymentService(
            CounterPaymentReceiptRepository receiptRepository,
            PaymentFlow flow,
            DiscoveryClient discovery,
            RestClient.Builder restClientBuilder,
            ObjectMapper mapper,
            StringRedisTemplate redis
    ) {
        this.receiptRepository = receiptRepository;
        this.flow = flow;
        this.discovery = discovery;
        this.restClient = restClientBuilder.build();
        this.mapper = mapper;
        this.redis = redis;
    }

    @Transactional
    public CounterPaymentReceiptResponse collect(CounterCollectionRequest request, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Header Idempotency-Key là bắt buộc");
        }

        // 1. Idempotency Gate check
        Optional<CounterPaymentReceipt> existing = receiptRepository.findByIdempotencyKey(idempotencyKey.trim());
        if (existing.isPresent()) {
            return DomainMapper.toCounterReceiptResponse(existing.get());
        }

        if (redis != null) {
            try {
                Boolean locked = redis.opsForValue().setIfAbsent("idem:counter-pay:" + idempotencyKey.trim(), "LOCKED", Duration.ofMinutes(5));
                if (Boolean.FALSE.equals(locked)) {
                    Optional<CounterPaymentReceipt> retry = receiptRepository.findByIdempotencyKey(idempotencyKey.trim());
                    if (retry.isPresent()) {
                        return DomainMapper.toCounterReceiptResponse(retry.get());
                    }
                    throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Giao dịch đang được xử lý, vui lòng chờ");
                }
            } catch (ApiException e) {
                throw e;
            } catch (Exception ex) {
                LOG.warn("Redis idempotency check warning: {}", ex.getMessage());
            }
        }

        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new AccessDeniedException("Chỉ nhân viên hoặc quản trị viên mới có quyền thu tiền quầy");
        }
        if (actor.role() != Role.ADMIN && actor.storeId() != null && !actor.storeId().equals(request.storeId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Nhân viên không thể thu tiền cho chi nhánh khác");
        }

        String method = request.method().trim().toUpperCase();
        if (!List.of("CASH", "BANK_TRANSFER", "SPLIT").contains(method)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Phương thức thanh toán không hợp lệ (CASH, BANK_TRANSFER, SPLIT)");
        }

        BigDecimal cashAmount = BigDecimal.ZERO;
        BigDecimal cashTendered = BigDecimal.ZERO;
        BigDecimal cashChange = BigDecimal.ZERO;
        BigDecimal roundingDifference = BigDecimal.ZERO;
        BigDecimal bankAmountDeclared = BigDecimal.ZERO;
        BigDecimal bankAmountReconciled = BigDecimal.ZERO;
        String status = "RECONCILED";
        boolean manualAcceptance = false;
        String exceptionReason = null;

        if ("CASH".equals(method)) {
            cashAmount = request.cashAmount() != null && request.cashAmount().signum() > 0 ? request.cashAmount() : request.totalDue();
            // Cash rounding to nearest 1,000 VND
            BigDecimal remainder = cashAmount.remainder(BigDecimal.valueOf(1000));
            if (remainder.compareTo(BigDecimal.ZERO) != 0) {
                BigDecimal rounded = cashAmount.divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1000));
                roundingDifference = rounded.subtract(cashAmount);
                cashAmount = rounded;
            } else {
                roundingDifference = cashAmount.subtract(request.totalDue());
            }

            cashTendered = request.cashTendered() != null ? request.cashTendered() : cashAmount;
            if (cashTendered.compareTo(cashAmount) < 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Tiền khách đưa không đủ so với số tiền cần thanh toán");
            }
            cashChange = cashTendered.subtract(cashAmount);

        } else if ("BANK_TRANSFER".equals(method)) {
            bankAmountDeclared = request.bankAmount() != null && request.bankAmount().signum() > 0 ? request.bankAmount() : request.totalDue();
            if (Boolean.TRUE.equals(request.manualAcceptance())) {
                if (request.exceptionReason() == null || request.exceptionReason().trim().isEmpty()) {
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "Lý do xác nhận thủ công không được để trống");
                }
                manualAcceptance = true;
                exceptionReason = request.exceptionReason().trim();
                bankAmountReconciled = BigDecimal.ZERO;
                status = "PENDING_RECONCILIATION";
            } else {
                bankAmountReconciled = bankAmountDeclared;
                status = "RECONCILED";
            }

        } else if ("SPLIT".equals(method)) {
            cashAmount = request.cashAmount() != null ? request.cashAmount() : BigDecimal.ZERO;
            bankAmountDeclared = request.bankAmount() != null ? request.bankAmount() : BigDecimal.ZERO;

            BigDecimal remainder = cashAmount.remainder(BigDecimal.valueOf(1000));
            if (remainder.compareTo(BigDecimal.ZERO) != 0) {
                BigDecimal rounded = cashAmount.divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1000));
                roundingDifference = rounded.subtract(cashAmount);
                cashAmount = rounded;
            }

            cashTendered = request.cashTendered() != null ? request.cashTendered() : cashAmount;
            if (cashTendered.compareTo(cashAmount) < 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Tiền khách đưa không đủ so với tiền mặt cần thanh toán");
            }
            cashChange = cashTendered.subtract(cashAmount);

            BigDecimal sumDue = cashAmount.add(bankAmountDeclared).subtract(roundingDifference);
            if (sumDue.compareTo(request.totalDue()) != 0 && cashAmount.add(bankAmountDeclared).compareTo(request.totalDue()) != 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Tổng tiền mặt và chuyển khoản phải bằng tổng tiền đơn hàng");
            }

            if (Boolean.TRUE.equals(request.manualAcceptance())) {
                if (request.exceptionReason() == null || request.exceptionReason().trim().isEmpty()) {
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "Lý do xác nhận thủ công không được để trống");
                }
                manualAcceptance = true;
                exceptionReason = request.exceptionReason().trim();
                bankAmountReconciled = BigDecimal.ZERO;
                status = "PENDING_RECONCILIATION";
            } else {
                bankAmountReconciled = bankAmountDeclared;
                status = "RECONCILED";
            }
        }

        String baseReceiptCode = "REC-" + request.orderCode();
        String receiptCode = baseReceiptCode;
        if (receiptRepository.findByReceiptCode(receiptCode).isPresent()) {
            receiptCode = baseReceiptCode + "-" + System.currentTimeMillis() % 10000;
        }

        CounterPaymentReceipt receipt = new CounterPaymentReceipt();
        receipt.setReceiptCode(receiptCode);
        receipt.setOrderId(request.orderId());
        receipt.setOrderCode(request.orderCode());
        receipt.setQueueNumber(request.queueNumber());
        receipt.setStoreId(request.storeId());
        receipt.setMethod(method);
        receipt.setTotalDue(request.totalDue());
        receipt.setCashAmount(cashAmount);
        receipt.setCashTendered(cashTendered);
        receipt.setCashChange(cashChange);
        receipt.setRoundingDifference(roundingDifference);
        receipt.setBankAmountDeclared(bankAmountDeclared);
        receipt.setBankAmountReconciled(bankAmountReconciled);
        receipt.setBankRefCode(request.bankRefCode());
        receipt.setStatus(status);
        receipt.setManualAcceptance(manualAcceptance);
        receipt.setExceptionReason(exceptionReason);
        receipt.setDiscrepancyAmount(BigDecimal.ZERO);
        receipt.setStaffId(actor.userId());
        receipt.setStaffName(actor.fullName() != null ? actor.fullName() : "Staff #" + actor.userId());
        receipt.setPrintCount(1);
        receipt.setIdempotencyKey(idempotencyKey.trim());
        receipt.setCreatedAt(Instant.now());
        receipt.setUpdatedAt(Instant.now());

        receipt = receiptRepository.save(receipt);

        // Update Order via REST
        updateOrderPaymentStatus(receipt.getOrderId(), "COLLECTED");

        // Enqueue Outbox / Kafka event payment.collected
        try {
            var payload = mapper.createObjectNode()
                    .put("receiptId", receipt.getId())
                    .put("receiptCode", receipt.getReceiptCode())
                    .put("orderId", receipt.getOrderId())
                    .put("orderCode", receipt.getOrderCode())
                    .put("storeId", receipt.getStoreId())
                    .put("method", receipt.getMethod())
                    .put("totalDue", receipt.getTotalDue())
                    .put("cashAmount", receipt.getCashAmount())
                    .put("cashChange", receipt.getCashChange())
                    .put("bankAmountDeclared", receipt.getBankAmountDeclared())
                    .put("bankAmountReconciled", receipt.getBankAmountReconciled())
                    .put("status", receipt.getStatus())
                    .put("manualAcceptance", receipt.getManualAcceptance())
                    .put("staffId", receipt.getStaffId())
                    .put("staffName", receipt.getStaffName());
            flow.enqueue("payment.collected", receipt.getOrderId(), payload);
        } catch (Exception ex) {
            LOG.warn("Failed to enqueue payment.collected outbox event: {}", ex.getMessage());
        }

        return DomainMapper.toCounterReceiptResponse(receipt);
    }

    @Transactional
    public CounterPaymentReceiptResponse voidReceipt(Long receiptId, VoidReceiptRequest request) {
        CounterPaymentReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy biên lai"));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new AccessDeniedException("Forbidden");
        }
        if (actor.role() != Role.ADMIN && actor.storeId() != null && !actor.storeId().equals(receipt.getStoreId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Không thể hủy biên lai của chi nhánh khác");
        }

        if ("VOIDED".equals(receipt.getStatus())) {
            return DomainMapper.toCounterReceiptResponse(receipt);
        }

        // Verify order is not COMPLETED
        try {
            PaymentFlow.Context ctx = flow.context(receipt.getOrderId());
            if ("COMPLETED".equalsIgnoreCase(ctx.status())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Đơn hàng đã bàn giao, không thể hủy biên lai");
            }
        } catch (ApiException e) {
            if (e.getCode() == ErrorCode.RESOURCE_CONFLICT) throw e;
            LOG.warn("Could not check order context: {}", e.getMessage());
        }

        receipt.setStatus("VOIDED");
        String voidReason = request != null && request.reason() != null && !request.reason().isBlank()
                ? request.reason().trim() : "Thu ngân hủy biên lai";
        receipt.setExceptionReason(receipt.getExceptionReason() != null
                ? receipt.getExceptionReason() + " | Void: " + voidReason : "Void: " + voidReason);
        receipt.setUpdatedAt(Instant.now());
        receipt = receiptRepository.save(receipt);

        // Update Order back to PENDING
        updateOrderPaymentStatus(receipt.getOrderId(), "PENDING");

        return DomainMapper.toCounterReceiptResponse(receipt);
    }

    @Transactional
    public CounterPaymentReceiptResponse printReceipt(Long receiptId) {
        CounterPaymentReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy biên lai"));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.storeId() != null && !actor.storeId().equals(receipt.getStoreId())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        receipt.setPrintCount(receipt.getPrintCount() + 1);
        receipt.setUpdatedAt(Instant.now());
        receipt = receiptRepository.save(receipt);
        return DomainMapper.toCounterReceiptResponse(receipt);
    }

    @Transactional(readOnly = true)
    public ShiftSummaryResponse getShiftSummary(Long storeId, String dateStr) {
        CurrentActor actor = CurrentActor.require();
        Long effectiveStoreId;
        if (actor.role() != Role.ADMIN) {
            effectiveStoreId = actor.storeId() != null ? actor.storeId() : (storeId != null ? storeId : 1L);
            if (storeId != null && actor.storeId() != null && !actor.storeId().equals(storeId)) {
                throw new ApiException(ErrorCode.FORBIDDEN, "Không thể xem ca trực của chi nhánh khác");
            }
        } else {
            effectiveStoreId = storeId != null ? storeId : (actor.storeId() != null ? actor.storeId() : 1L);
        }

        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate date = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr.trim()) : LocalDate.now(zone);
        Instant start = date.atStartOfDay(zone).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();

        List<CounterPaymentReceipt> receipts = receiptRepository.findByStoreIdAndCreatedAtBetween(effectiveStoreId, start, end);

        BigDecimal totalCashCollected = BigDecimal.ZERO;
        BigDecimal totalCashChangeGiven = BigDecimal.ZERO;
        BigDecimal totalBankReconciled = BigDecimal.ZERO;
        BigDecimal totalBankPending = BigDecimal.ZERO;
        BigDecimal totalDiscrepancy = BigDecimal.ZERO;
        long transactionCount = 0;

        for (CounterPaymentReceipt r : receipts) {
            if ("VOIDED".equals(r.getStatus())) continue;
            transactionCount++;
            if (r.getCashAmount() != null) totalCashCollected = totalCashCollected.add(r.getCashAmount());
            if (r.getCashChange() != null) totalCashChangeGiven = totalCashChangeGiven.add(r.getCashChange());

            if ("RECONCILED".equals(r.getStatus())) {
                if (r.getBankAmountReconciled() != null) {
                    totalBankReconciled = totalBankReconciled.add(r.getBankAmountReconciled());
                }
            } else if ("PENDING_RECONCILIATION".equals(r.getStatus())) {
                if (r.getBankAmountDeclared() != null) {
                    totalBankPending = totalBankPending.add(r.getBankAmountDeclared());
                }
            }

            if (r.getDiscrepancyAmount() != null) {
                totalDiscrepancy = totalDiscrepancy.add(r.getDiscrepancyAmount());
            }
        }

        BigDecimal netCashInDrawer = totalCashCollected.subtract(totalCashChangeGiven);

        return new ShiftSummaryResponse(
                effectiveStoreId,
                date,
                totalCashCollected,
                totalCashChangeGiven,
                netCashInDrawer,
                totalBankReconciled,
                totalBankPending,
                totalDiscrepancy,
                transactionCount
        );
    }

    private void updateOrderPaymentStatus(Long orderId, String paymentStatus) {
        try {
            var instances = discovery.getInstances("cart-order-service");
            URI baseUri = instances.isEmpty() ? URI.create("http://cart-order-service:8082") : instances.getFirst().getUri();
            var auth = SecurityContextHolder.getContext().getAuthentication();
            String token = (auth instanceof JwtAuthenticationToken jwt) ? jwt.getToken().getTokenValue() : null;

            restClient.put()
                    .uri(baseUri.resolve("/api/orders/" + orderId + "/payment-status"))
                    .headers(headers -> {
                        if (token != null) headers.setBearerAuth(token);
                    })
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("paymentStatus", paymentStatus))
                    .retrieve()
                    .toBodilessEntity();
            LOG.info("Updated order {} paymentStatus to {}", orderId, paymentStatus);
        } catch (Exception ex) {
            LOG.warn("Failed to update order {} payment status via REST: {}", orderId, ex.getMessage());
        }
    }
}
