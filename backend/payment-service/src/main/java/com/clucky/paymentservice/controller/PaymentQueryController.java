package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.BankTransactionResponse;
import com.clucky.paymentservice.entity.BankTransaction;
import com.clucky.paymentservice.entity.CounterPaymentReceipt;
import com.clucky.paymentservice.repository.BankTransactionRepository;
import com.clucky.paymentservice.repository.CounterPaymentReceiptRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentQueryController {

    private final BankTransactionRepository bankTransactionRepository;
    private final CounterPaymentReceiptRepository counterPaymentReceiptRepository;

    public PaymentQueryController(BankTransactionRepository bankTransactionRepository,
                                  CounterPaymentReceiptRepository counterPaymentReceiptRepository) {
        this.bankTransactionRepository = bankTransactionRepository;
        this.counterPaymentReceiptRepository = counterPaymentReceiptRepository;
    }

    @GetMapping("/bank-transactions")
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
    public ResponseEntity<List<CounterPaymentReceipt>> getReceipts(
            @RequestParam(name = "storeId", required = false) Long storeId
    ) {
        if (storeId != null) {
            return ResponseEntity.ok(counterPaymentReceiptRepository.findByStoreId(storeId));
        }
        return ResponseEntity.ok(counterPaymentReceiptRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/receipts/order/{orderCode}")
    public ResponseEntity<CounterPaymentReceipt> getReceiptByOrderCode(@PathVariable String orderCode) {
        return counterPaymentReceiptRepository.findByOrderCode(orderCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
