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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CounterPaymentService {
    private static final Logger LOG = LoggerFactory.getLogger(CounterPaymentService.class);

    private final CounterPaymentReceiptRepository receiptRepository;
    private final PaymentFlow flow;
    private final ObjectMapper mapper;
    private final JdbcTemplate jdbc;
    private final PaymentOperations operations;

    public CounterPaymentService(
            CounterPaymentReceiptRepository receiptRepository,
            PaymentFlow flow,
            ObjectMapper mapper,
            JdbcTemplate jdbc,
            PaymentOperations operations
    ) {
        this.receiptRepository = receiptRepository;
        this.flow = flow;
        this.mapper = mapper;
        this.jdbc = jdbc;
        this.operations = operations;
    }

    @Transactional
    public CounterPaymentReceiptResponse collect(CounterCollectionRequest request, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.indexOf('\0') >= 0 || idempotencyKey.trim().length() > 128) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Header Idempotency-Key là bắt buộc");
        }

        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new AccessDeniedException("Chỉ nhân viên hoặc quản trị viên mới có quyền thu tiền quầy");
        }
        if (actor.role() != Role.ADMIN && (actor.storeId() == null || !actor.storeId().equals(request.storeId()))) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Nhân viên không thể thu tiền cho chi nhánh khác");
        }
        // Serialize collection attempts for this order across instances, including
        // attempts with different idempotency keys.
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(?)", Object.class, request.orderId());

        Optional<CounterPaymentReceipt> existing = receiptRepository.findByIdempotencyKey(idempotencyKey.trim());
        if (existing.isPresent()) {
            if (!sameCollection(existing.get(), request)) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Idempotency-Key đã được dùng cho giao dịch khác");
            }
            return DomainMapper.toCounterReceiptResponse(existing.get());
        }
        PaymentFlow.Context order = flow.context(request.orderId());
        if (!List.of("COUNTER", "WEB").contains(order.orderSource()) || !request.orderCode().equals(order.orderCode())
                || !request.storeId().equals(order.storeId()) || order.amount().compareTo(request.totalDue()) != 0) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Thông tin đơn hàng hoặc số tiền không khớp");
        }
        if (!"PENDING".equals(order.paymentStatus())
                || !List.of("CONFIRMED", "PREPARING", "READY", "SHIPPING").contains(order.status())
                || receiptRepository.findByOrderId(request.orderId()).stream().anyMatch(r -> !"VOIDED".equals(r.getStatus()))) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Đơn hàng đã thu tiền hoặc không còn cho phép thu tiền");
        }
        for (BigDecimal amount : List.of(request.totalDue(),
                request.cashAmount() == null ? BigDecimal.ZERO : request.cashAmount(),
                request.cashTendered() == null ? BigDecimal.ZERO : request.cashTendered(),
                request.bankAmount() == null ? BigDecimal.ZERO : request.bankAmount())) {
            if (amount.signum() < 0 || amount.stripTrailingZeros().scale() > 0
                    || amount.compareTo(new BigDecimal("999999999999")) > 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Số tiền VND không hợp lệ");
            }
        }
        if (request.totalDue().signum() <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR, "Tổng tiền phải lớn hơn 0");

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
            if (request.cashAmount() != null && request.cashAmount().compareTo(request.totalDue()) != 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Tiền mặt phải bằng tổng tiền đơn hàng trước làm tròn");
            }
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
            if (bankAmountDeclared.compareTo(request.totalDue()) != 0 || !Boolean.TRUE.equals(request.manualAcceptance())) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Chuyển khoản phải được xác nhận thủ công hoặc đối soát bằng chứng từ ngân hàng");
            }
            if (Boolean.TRUE.equals(request.manualAcceptance())) {
                if (request.exceptionReason() == null || request.exceptionReason().trim().isEmpty()) {
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "Lý do xác nhận thủ công không được để trống");
                }
                manualAcceptance = true;
                exceptionReason = request.exceptionReason().trim();
                bankAmountReconciled = BigDecimal.ZERO;
                status = "PENDING_RECONCILIATION";
            }

        } else if ("SPLIT".equals(method)) {
            cashAmount = request.cashAmount() != null ? request.cashAmount() : BigDecimal.ZERO;
            bankAmountDeclared = request.bankAmount() != null ? request.bankAmount() : BigDecimal.ZERO;
            if (cashAmount.signum() <= 0 || bankAmountDeclared.signum() <= 0 || !Boolean.TRUE.equals(request.manualAcceptance())) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Thanh toán kết hợp cần hai nguồn tiền và xác nhận chuyển khoản thủ công");
            }

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
        receipt.setPrintCount(0);
        receipt.setIdempotencyKey(idempotencyKey.trim());
        receipt.setCreatedAt(Instant.now());
        receipt.setUpdatedAt(Instant.now());

        receipt = receiptRepository.save(receipt);

        UUID operationKey = UUID.nameUUIDFromBytes(idempotencyKey.trim().getBytes(StandardCharsets.UTF_8));
        UUID collectionId = operations.createCounterCollection(request.orderId(), order, actor,
                cashAmount, bankAmountDeclared, cashTendered, cashChange,
                exceptionReason != null ? exceptionReason : "Thu tiền tại quầy", operationKey);
        receipt.setCollectionId(collectionId);
        receipt.setCollectionStatus("PENDING");
        receipt = receiptRepository.save(receipt);

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
        if (actor.role() != Role.ADMIN && (actor.storeId() == null || !actor.storeId().equals(receipt.getStoreId()))) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Không thể hủy biên lai của chi nhánh khác");
        }
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class,
                "payment-order:" + receipt.getOrderId());

        if ("VOIDED".equals(receipt.getStatus())) {
            return DomainMapper.toCounterReceiptResponse(receipt);
        }
        if (receipt.getBankTxId() != null || receipt.getBankAmountReconciled() != null
                && receipt.getBankAmountReconciled().signum() > 0) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Chuyển khoản đã đối soát cần xử lý hoàn tiền riêng, không thể hủy biên lai");
        }

        if (receipt.getCollectionId() == null || !List.of("CANCELLED", "EXPIRED", "SUPERSEDED", "STALE_VERSION").contains(receipt.getCollectionStatus())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Chỉ hủy biên lai sau khi Order từ chối thu tiền; giao dịch đang xử lý hoặc đã thu không thể hủy trực tiếp");
        }

        // Verify order is still awaiting collection
        PaymentFlow.Context ctx = flow.context(receipt.getOrderId());
        if ("COMPLETED".equalsIgnoreCase(ctx.status()) || !"PENDING".equals(ctx.paymentStatus())
                || !receipt.getStoreId().equals(ctx.storeId()) || !receipt.getOrderCode().equals(ctx.orderCode())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Trạng thái đơn hàng không cho phép hủy biên lai");
        }

        receipt.setStatus("VOIDED");
        String voidReason = request != null && request.reason() != null && !request.reason().isBlank()
                ? request.reason().trim() : "Thu ngân hủy biên lai";
        receipt.setExceptionReason(receipt.getExceptionReason() != null
                ? receipt.getExceptionReason() + " | Void: " + voidReason : "Void: " + voidReason);
        receipt.setUpdatedAt(Instant.now());
        receipt = receiptRepository.save(receipt);

        return DomainMapper.toCounterReceiptResponse(receipt);
    }

    @Transactional
    public CounterPaymentReceiptResponse printReceipt(Long receiptId) {
        CounterPaymentReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy biên lai"));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new AccessDeniedException("Forbidden");
        }
        if (actor.role() != Role.ADMIN && (actor.storeId() == null || !actor.storeId().equals(receipt.getStoreId()))) {
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
            if (actor.storeId() == null) throw new ApiException(ErrorCode.FORBIDDEN, "Tài khoản chưa có chi nhánh");
            effectiveStoreId = actor.storeId();
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
            if ("VOIDED".equals(r.getStatus()) || !List.of("ACCEPTED", "LEGACY").contains(r.getCollectionStatus())) continue;
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

        // Customer QR payments and accepted COD collections belong to this store and
        // day even though they do not create a counter receipt.
        BigDecimal onlineTransfers = jdbc.queryForObject(
                "SELECT coalesce(sum(amount),0) FROM payment_service.payments "
                        + "WHERE store_id=? AND live_payment AND method='BANK_TRANSFER' AND status='PAID' "
                        + "AND paid_at>=? AND paid_at<?",
                BigDecimal.class, effectiveStoreId, java.sql.Timestamp.from(start), java.sql.Timestamp.from(end));
        totalBankReconciled = totalBankReconciled.add(onlineTransfers == null ? BigDecimal.ZERO : onlineTransfers);

        List<Map<String, Object>> collections = jdbc.queryForList(
                "SELECT c.cash_amount,c.cash_change,c.transfer_amount,"
                        + "coalesce((SELECT sum(b.amount) FROM payment_service.bank_transactions b "
                        + "WHERE b.collection_id=c.id AND b.transfer_direction='in' "
                        + "AND (b.conflict_count=0 OR b.conflict_reviewed)),0) AS bank_evidence "
                        + "FROM payment_service.collections c WHERE c.store_id=? AND c.status='ACCEPTED' "
                        + "AND c.resolved_at>=? AND c.resolved_at<? "
                        + "AND NOT EXISTS (SELECT 1 FROM payment_service.counter_payment_receipts r "
                        + "WHERE r.order_id=c.order_id AND r.status<>'VOIDED')",
                effectiveStoreId, java.sql.Timestamp.from(start), java.sql.Timestamp.from(end));
        for (Map<String, Object> collection : collections) {
            BigDecimal cash = (BigDecimal) collection.get("cash_amount");
            BigDecimal change = (BigDecimal) collection.get("cash_change");
            BigDecimal declared = (BigDecimal) collection.get("transfer_amount");
            BigDecimal evidence = (BigDecimal) collection.get("bank_evidence");
            totalCashCollected = totalCashCollected.add(cash);
            totalCashChangeGiven = totalCashChangeGiven.add(change);
            totalBankReconciled = totalBankReconciled.add(evidence.min(declared));
            totalBankPending = totalBankPending.add(declared.subtract(evidence).max(BigDecimal.ZERO));
            transactionCount++;
        }

        BigDecimal netCashInDrawer = totalCashCollected;

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

    private boolean sameCollection(CounterPaymentReceipt receipt, CounterCollectionRequest request) {
        String method = request.method().trim().toUpperCase();
        BigDecimal originalCash = receipt.getCashAmount().subtract(receipt.getRoundingDifference());
        BigDecimal requestedCash = request.cashAmount() != null && request.cashAmount().signum() > 0
                ? request.cashAmount() : "CASH".equals(method) ? request.totalDue() : BigDecimal.ZERO;
        BigDecimal requestedBank = request.bankAmount() != null && request.bankAmount().signum() > 0
                ? request.bankAmount() : "BANK_TRANSFER".equals(method) ? request.totalDue() : BigDecimal.ZERO;
        BigDecimal requestedTendered = request.cashTendered() != null ? request.cashTendered() : receipt.getCashAmount();
        return receipt.getOrderId().equals(request.orderId())
                && receipt.getStoreId().equals(request.storeId())
                && receipt.getOrderCode().equals(request.orderCode())
                && receipt.getMethod().equals(method)
                && receipt.getTotalDue().compareTo(request.totalDue()) == 0
                && originalCash.compareTo(requestedCash) == 0
                && receipt.getBankAmountDeclared().compareTo(requestedBank) == 0
                && receipt.getCashTendered().compareTo(requestedTendered) == 0
                && receipt.getManualAcceptance().equals(Boolean.TRUE.equals(request.manualAcceptance()))
                && java.util.Objects.equals(receipt.getBankRefCode(), request.bankRefCode())
                && java.util.Objects.equals(receipt.getExceptionReason(),
                        request.exceptionReason() == null ? null : request.exceptionReason().trim());
    }
}
