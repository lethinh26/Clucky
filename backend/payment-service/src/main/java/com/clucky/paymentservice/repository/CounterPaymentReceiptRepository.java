package com.clucky.paymentservice.repository;

import com.clucky.paymentservice.entity.CounterPaymentReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CounterPaymentReceiptRepository extends JpaRepository<CounterPaymentReceipt, Long> {
    Optional<CounterPaymentReceipt> findByReceiptCode(String receiptCode);
    Optional<CounterPaymentReceipt> findByIdempotencyKey(String idempotencyKey);
    Optional<CounterPaymentReceipt> findByOrderCode(String orderCode);
    List<CounterPaymentReceipt> findByOrderCodeOrderByCreatedAtDesc(String orderCode);
    List<CounterPaymentReceipt> findByOrderId(Long orderId);
    List<CounterPaymentReceipt> findByStoreId(Long storeId);
    List<CounterPaymentReceipt> findByStatus(String status);
    List<CounterPaymentReceipt> findByStoreIdAndCreatedAtBetween(Long storeId, Instant start, Instant end);
    List<CounterPaymentReceipt> findByCreatedAtBetween(Instant start, Instant end);
}

