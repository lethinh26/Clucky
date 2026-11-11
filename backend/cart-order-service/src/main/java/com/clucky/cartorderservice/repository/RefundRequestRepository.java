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
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT refund FROM RefundRequest refund WHERE refund.id = :id")
    Optional<RefundRequest> lockById(@Param("id") Long id);

    @Query("SELECT refund.id FROM RefundRequest refund WHERE refund.paymentOperation IS NOT NULL AND refund.paymentRetryAt<=CURRENT_TIMESTAMP ORDER BY refund.paymentRetryAt,refund.id")
    List<Long> pendingConfirmations(Pageable pageable);

    @Query("SELECT refund.id FROM RefundRequest refund WHERE refund.status='PENDING' AND refund.paymentOperation IS NULL "
            + "AND refund.paymentError IS NULL AND refund.createdAt<:before AND (refund.paymentRetryAt IS NULL OR refund.paymentRetryAt<=CURRENT_TIMESTAMP) ORDER BY refund.id")
    List<Long> untrackedReservations(@Param("before") java.time.Instant before, Pageable pageable);

    @Query("SELECT count(refund) FROM RefundRequest refund, Order orders WHERE refund.orderId=orders.id AND (:storeId IS NULL OR orders.storeId=:storeId) AND refund.status IN ('PENDING','APPROVED','PROCESSING','WAITING_BANK_DETAILS')")
    long countOpen(@Param("storeId") Long storeId);
    Optional<RefundRequest> findByIdAndCustomerId(Long id, Long customerId);
    List<RefundRequest> findAllByOrderId(Long orderId);
    Page<RefundRequest> findByCustomerId(Long customerId, Pageable pageable);
    Page<RefundRequest> findByCustomerIdAndOrderId(Long customerId, Long orderId, Pageable pageable);

    @Query("""
        SELECT r FROM RefundRequest r, Order o
        WHERE r.orderId = o.id
          AND (:orderId IS NULL OR r.orderId = :orderId)
          AND (:storeId IS NULL OR o.storeId = :storeId)
          AND (:status IS NULL OR r.status = :status)
          AND (:customerId IS NULL OR r.customerId = :customerId)
        ORDER BY r.id DESC
    """)
    Page<RefundRequest> findRefundRequests(
        @Param("customerId") Long customerId,
        @Param("orderId") Long orderId,
        @Param("storeId") Long storeId,
        @Param("status") String status,
        Pageable pageable
    );
}
