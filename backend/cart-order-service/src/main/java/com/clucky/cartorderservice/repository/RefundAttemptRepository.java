package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.RefundAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RefundAttemptRepository extends JpaRepository<RefundAttempt, Long> {
    List<RefundAttempt> findByRefundRequestIdOrderByAttemptNumberAsc(Long refundRequestId);
    Optional<RefundAttempt> findByAttemptId(String attemptId);
    Optional<RefundAttempt> findByRefundRequestIdAndAttemptNumber(Long refundRequestId, Integer attemptNumber);
}

