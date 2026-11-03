package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    Optional<Voucher> findByIdAndStoreId(Long id, Long storeId);
    Optional<Voucher> findByCode(String code);
}
