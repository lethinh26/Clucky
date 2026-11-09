package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.OrderProjectionTracker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderProjectionTrackerRepository extends JpaRepository<OrderProjectionTracker, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OrderProjectionTracker> findByOrderId(Long orderId);

    @Modifying
    @Query(value = """
            INSERT INTO review_report_service.order_projection_trackers (order_id, store_id, stat_date)
            VALUES (:orderId, 0, :statDate) ON CONFLICT (order_id) DO NOTHING
            """, nativeQuery = true)
    int initialize(@Param("orderId") long orderId, @Param("statDate") LocalDate statDate);

    boolean existsByOrderId(Long orderId);
}
