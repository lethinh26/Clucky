package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.MemberPoints;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MemberPointsRepository extends JpaRepository<MemberPoints, Long> {
    Optional<MemberPoints> findByIdAndCustomerId(Long id, Long customerId);

    Optional<MemberPoints> findByCustomerId(Long customerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MemberPoints m WHERE m.customerId = :customerId")
    Optional<MemberPoints> findByCustomerIdForUpdate(@Param("customerId") Long customerId);

    @Modifying
    @Query(value = "INSERT INTO promotion_service.member_points (customer_id, total_points, tier, updated_at) " +
            "VALUES (:customerId, 0, 'MEMBER', NOW()) ON CONFLICT (customer_id) DO NOTHING",
            nativeQuery = true)
    void initCustomerPoints(@Param("customerId") Long customerId);
}
