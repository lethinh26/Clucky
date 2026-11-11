package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.BankTransactionResponse;
import com.clucky.paymentservice.dto.CounterPaymentReceiptResponse;
import com.clucky.paymentservice.config.AccessGuard;
import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.Role;
import com.clucky.paymentservice.mapper.DomainMapper;
import com.clucky.paymentservice.entity.BankTransaction;
import com.clucky.paymentservice.entity.CounterPaymentReceipt;
import com.clucky.paymentservice.repository.BankTransactionRepository;
import com.clucky.paymentservice.repository.CounterPaymentReceiptRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentQueryController {

    private final BankTransactionRepository bankTransactionRepository;
    private final CounterPaymentReceiptRepository counterPaymentReceiptRepository;
    private final AccessGuard access;

    public PaymentQueryController(BankTransactionRepository bankTransactionRepository,
                                  CounterPaymentReceiptRepository counterPaymentReceiptRepository, AccessGuard access) {
        this.bankTransactionRepository = bankTransactionRepository;
        this.counterPaymentReceiptRepository = counterPaymentReceiptRepository;
        this.access = access;
    }

    @GetMapping("/bank-transactions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BankTransactionResponse>> getBankTransactions() {
        List<BankTransaction> list = bankTransactionRepository.findAll(Sort.by(Sort.Direction.DESC, "receivedAt"));
        List<BankTransactionResponse> response = list.stream().map(tx -> new BankTransactionResponse(
                tx.getId(),
                tx.getBankTxId(),
                tx.getBankAccount(),
                tx.getAmount(),
                tx.getContent(),
                tx.getReceivedAt(),
                tx.getMatchedOrderCode()
        )).toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/receipts")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<List<CounterPaymentReceiptResponse>> getReceipts(
            @RequestParam(name = "storeId", required = false) Long storeId
    ) {
        Long effectiveStore = access.effectiveStore(storeId);
        List<CounterPaymentReceipt> rows = effectiveStore == null
                ? counterPaymentReceiptRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                : counterPaymentReceiptRepository.findByStoreId(effectiveStore);
        return ResponseEntity.ok(rows.stream().map(DomainMapper::toCounterReceiptResponse).toList());
    }

    @GetMapping("/receipts/order/{orderCode}")
    @PreAuthorize("hasAnyRole('STAFF', 'STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<CounterPaymentReceiptResponse> getReceiptByOrderCode(@PathVariable String orderCode) {
        return counterPaymentReceiptRepository.findByOrderCodeOrderByCreatedAtDesc(orderCode).stream()
                .filter(receipt -> !"VOIDED".equals(receipt.getStatus()))
                .findFirst()
                .map(receipt -> {
                    access.requireStore(receipt.getStoreId());
                    return DomainMapper.toCounterReceiptResponse(receipt);
                })
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
