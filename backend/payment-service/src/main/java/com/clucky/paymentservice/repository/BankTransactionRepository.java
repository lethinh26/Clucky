package com.clucky.paymentservice.repository;

import com.clucky.paymentservice.entity.BankTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, Long> {
    Optional<BankTransaction> findByBankTxId(String bankTxId);
    Optional<BankTransaction> findByMatchedOrderCode(String matchedOrderCode);
}
