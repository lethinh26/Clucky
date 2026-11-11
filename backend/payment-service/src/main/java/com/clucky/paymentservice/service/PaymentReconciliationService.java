package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.BankWebhookPayload;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.clucky.paymentservice.entity.BankTransaction;
import com.clucky.paymentservice.entity.CounterPaymentReceipt;
import com.clucky.paymentservice.repository.BankTransactionRepository;
import com.clucky.paymentservice.repository.CounterPaymentReceiptRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class PaymentReconciliationService {
    private static final Logger LOG = LoggerFactory.getLogger(PaymentReconciliationService.class);

    private final CounterPaymentReceiptRepository receiptRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final ObjectMapper objectMapper;

    public PaymentReconciliationService(
            CounterPaymentReceiptRepository receiptRepository,
            BankTransactionRepository bankTransactionRepository,
            ObjectMapper objectMapper
    ) {
        this.receiptRepository = receiptRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public boolean processLateBankWebhook(BankWebhookPayload payload) {
        if (payload == null || payload.id() == null || payload.id().isBlank()) {
            return false;
        }

        // 1. Idempotency Gate for bank_tx_id
        Optional<BankTransaction> existingTx = bankTransactionRepository.findByBankTxId(payload.id());
        if (existingTx.isPresent()) {
            BankTransaction previous = existingTx.get();
            if (payload.transferAmount() == null || previous.getAmount().compareTo(payload.transferAmount()) != 0
                    || !java.util.Objects.equals(previous.getContent(), payload.content())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Mã giao dịch đã tồn tại với nội dung khác");
            }
            LOG.info("Bank transaction already processed: {}", payload.id());
            return true;
        }

        // Record incoming bank transaction
        BankTransaction tx = new BankTransaction();
        tx.setBankTxId(payload.id());
        tx.setAmount(payload.transferAmount() != null ? payload.transferAmount() : BigDecimal.ZERO);
        tx.setContent(payload.content());
        tx.setReceivedAt(Instant.now());
        tx.setBankAccount(payload.referenceCode());
        try {
            tx.setRawPayload(objectMapper.valueToTree(payload));
        } catch (Exception e) {
            // ignore serialization error
        }

        // 2. Find matching counter receipt in PENDING_RECONCILIATION
        List<CounterPaymentReceipt> pendingReceipts = receiptRepository.findByStatus("PENDING_RECONCILIATION");
        CounterPaymentReceipt matchedReceipt = null;

        String contentUpper = payload.content() != null ? payload.content().toUpperCase() : "";
        String refCodeUpper = payload.referenceCode() != null ? payload.referenceCode().toUpperCase() : "";

        for (CounterPaymentReceipt receipt : pendingReceipts) {
            String orderCode = receipt.getOrderCode() != null ? receipt.getOrderCode().toUpperCase() : "";
            String receiptCode = receipt.getReceiptCode() != null ? receipt.getReceiptCode().toUpperCase() : "";
            String bankRef = receipt.getBankRefCode() != null ? receipt.getBankRefCode().toUpperCase() : "";

            if (containsReference(contentUpper, orderCode) || containsReference(refCodeUpper, orderCode)
                    || containsReference(contentUpper, receiptCode) || containsReference(refCodeUpper, receiptCode)
                    || containsReference(contentUpper, bankRef) || containsReference(refCodeUpper, bankRef)) {
                if (matchedReceipt != null && !matchedReceipt.getId().equals(receipt.getId())) {
                    matchedReceipt = null;
                    break; // Ambiguous reference: retain the bank transaction for manual review.
                }
                matchedReceipt = receipt;
            }
        }

        if (matchedReceipt != null) {
            tx.setMatchedOrderCode(matchedReceipt.getOrderCode());
            bankTransactionRepository.save(tx);

            BigDecimal declared = matchedReceipt.getBankAmountDeclared() != null ? matchedReceipt.getBankAmountDeclared() : BigDecimal.ZERO;
            BigDecimal transferAmount = payload.transferAmount() != null ? payload.transferAmount() : BigDecimal.ZERO;

            if (declared.compareTo(transferAmount) == 0) {
                // Exact match: transition to RECONCILED
                matchedReceipt.setBankTxId(payload.id());
                matchedReceipt.setBankAmountReconciled(transferAmount);
                matchedReceipt.setStatus("RECONCILED");
                matchedReceipt.setDiscrepancyAmount(BigDecimal.ZERO);
                matchedReceipt.setUpdatedAt(Instant.now());
                receiptRepository.save(matchedReceipt);
                LOG.info("Counter receipt {} reconciled with bank tx {}", matchedReceipt.getReceiptCode(), payload.id());
            } else {
                // Discrepancy
                matchedReceipt.setBankTxId(payload.id());
                matchedReceipt.setBankAmountReconciled(transferAmount);
                matchedReceipt.setStatus("DISCREPANCY");
                matchedReceipt.setDiscrepancyAmount(transferAmount.subtract(declared));
                matchedReceipt.setUpdatedAt(Instant.now());
                receiptRepository.save(matchedReceipt);
                LOG.warn("Counter receipt {} discrepancy: declared={}, transfer={}", matchedReceipt.getReceiptCode(), declared, transferAmount);
            }

            // CRITICAL: TUYET DOI KHONG CONG THEM TIEN VAO DON HANG!
            return true;
        }

        // If no counter receipt matched, save transaction for reference
        bankTransactionRepository.save(tx);
        return true;
    }

    private static boolean containsReference(String text, String reference) {
        if (reference == null || reference.isBlank()) return false;
        return Pattern.compile("(?<![A-Z0-9])" + Pattern.quote(reference) + "(?![A-Z0-9])")
                .matcher(text).find();
    }
}
