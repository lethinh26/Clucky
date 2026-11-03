package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.MemberPoints;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MemberPointsRepository extends JpaRepository<MemberPoints, Long> {
    Optional<MemberPoints> findByIdAndCustomerId(Long id, Long customerId);
}
