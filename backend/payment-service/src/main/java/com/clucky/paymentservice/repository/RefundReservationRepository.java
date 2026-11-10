package com.clucky.paymentservice.repository;

import com.clucky.paymentservice.entity.RefundReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RefundReservationRepository extends JpaRepository<RefundReservation, Long> {
    Optional<RefundReservation> findByRefundRequestId(Long refundRequestId);

    @Query("SELECT r FROM RefundReservation r WHERE r.orderId = :orderId AND r.status IN ('HELD', 'CONFIRMED')")
    List<RefundReservation> findActiveByOrderId(@Param("orderId") Long orderId);
}

