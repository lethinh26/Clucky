package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.PointTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {
    Optional<PointTransaction> findByIdAndCustomerId(Long id, Long customerId);

    Optional<PointTransaction> findByOperationKey(String operationKey);

    Page<PointTransaction> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);

    List<PointTransaction> findTop20ByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<PointTransaction> findByCustomerIdAndOrderId(Long customerId, Long orderId);

    List<PointTransaction> findByCustomerIdAndOrderIdAndType(Long customerId, Long orderId, String type);
}
