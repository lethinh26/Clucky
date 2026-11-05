package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.OrderProjectionTracker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderProjectionTrackerRepository extends JpaRepository<OrderProjectionTracker, Long> {

    Optional<OrderProjectionTracker> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);
}
