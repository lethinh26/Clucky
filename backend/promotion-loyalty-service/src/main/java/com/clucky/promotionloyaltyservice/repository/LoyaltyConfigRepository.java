package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.LoyaltyConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LoyaltyConfigRepository extends JpaRepository<LoyaltyConfig, Long> {
    Optional<LoyaltyConfig> findFirstByOrderByIdAsc();
}
