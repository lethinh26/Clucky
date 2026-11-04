package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.PointTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {
    Optional<PointTransaction> findByIdAndCustomerId(Long id, Long customerId);
}
