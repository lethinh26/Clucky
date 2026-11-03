package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.VoucherUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VoucherUsageRepository extends JpaRepository<VoucherUsage, Long> {
    Optional<VoucherUsage> findByIdAndCustomerId(Long id, Long customerId);
}
