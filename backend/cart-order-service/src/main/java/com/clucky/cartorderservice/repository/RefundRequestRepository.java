package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.RefundRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {
    Optional<RefundRequest> findByIdAndCustomerId(Long id, Long customerId);
    List<RefundRequest> findAllByOrderId(Long orderId);
    Page<RefundRequest> findByCustomerId(Long customerId, Pageable pageable);

    @Query("""
        SELECT r FROM RefundRequest r, Order o
        WHERE r.orderId = o.id
          AND (:storeId IS NULL OR o.storeId = :storeId)
          AND (:status IS NULL OR r.status = :status)
        ORDER BY r.id DESC
    """)
    Page<RefundRequest> findRefundRequests(
        @Param("storeId") Long storeId,
        @Param("status") String status,
        Pageable pageable
    );
}
