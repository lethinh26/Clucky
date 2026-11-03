package com.clucky.shippingservice.repository;

import com.clucky.shippingservice.entity.ShippingFeeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShippingFeeConfigRepository extends JpaRepository<ShippingFeeConfig, Long> {
    Optional<ShippingFeeConfig> findByIdAndStoreId(Long id, Long storeId);
}
