package com.clucky.paymentservice.mapper;

import com.clucky.paymentservice.dto.*;
import com.clucky.paymentservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static QrPaymentResponse toQrResponse(Payment entity) {
        return new QrPaymentResponse(entity.getId(), entity.getOrderCode(), entity.getAmount(),
                entity.getStatus(), entity.getQrContent(), entity.getExpiresAt());
    }

    public static PaymentResponse toResponse(Payment entity) {
        return new PaymentResponse(
                entity.getId(),
                entity.getOrderId(),
                entity.getOrderCode(),
                entity.getMethod(),
                entity.getAmount(),
                entity.getStatus(),
                entity.getQrContent(),
                entity.getExpiresAt(),
                entity.getPaidAt()
        );
    }

    public static BankTransactionResponse toResponse(BankTransaction entity) {
        return new BankTransactionResponse(
                entity.getId(),
                entity.getBankTxId(),
                entity.getBankAccount(),
                entity.getAmount(),
                entity.getContent(),
                entity.getReceivedAt(),
                entity.getMatchedOrderCode()
        );
    }

    public static WebhookLogResponse toResponse(WebhookLog entity) {
        return new WebhookLogResponse(
                entity.getId(),
                entity.getProvider(),
                entity.getSignatureValid(),
                entity.getProcessed(),
                entity.getCreatedAt()
        );
    }

    public static BankAccountConfigResponse toResponse(BankAccountConfig entity) {
        return new BankAccountConfigResponse(
                entity.getId(),
                entity.getBankName(),
                entity.getAccountNo(),
                entity.getAccountName(),
                entity.getIsActive()
        );
    }

    public static CounterPaymentReceiptResponse toCounterReceiptResponse(CounterPaymentReceipt entity) {
        if (entity == null) return null;
        return new CounterPaymentReceiptResponse(
                entity.getId(),
                entity.getReceiptCode(),
                entity.getOrderId(),
                entity.getOrderCode(),
                entity.getQueueNumber(),
                entity.getStoreId(),
                entity.getMethod(),
                entity.getTotalDue(),
                entity.getCashAmount(),
                entity.getCashTendered(),
                entity.getCashChange(),
                entity.getRoundingDifference(),
                entity.getBankAmountDeclared(),
                entity.getBankAmountReconciled(),
                entity.getBankRefCode(),
                entity.getBankTxId(),
                entity.getStatus(),
                entity.getManualAcceptance(),
                entity.getDiscrepancyAmount(),
                entity.getExceptionReason(),
                entity.getStaffId(),
                entity.getStaffName(),
                entity.getPrintCount(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
