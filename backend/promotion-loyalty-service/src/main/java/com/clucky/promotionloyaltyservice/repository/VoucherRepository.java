package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.model.Voucher;
import com.clucky.promotionloyaltyservice.model.VoucherScope;
import com.clucky.promotionloyaltyservice.model.VoucherStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long>, JpaSpecificationExecutor<Voucher> {

    Optional<Voucher> findByIdAndStoreId(Long id, Long storeId);

    Optional<Voucher> findByCode(String code);

    Optional<Voucher> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    /**
     * Find available vouchers for a given store (or all stores if storeId is null).
     */
    @Query("""
        SELECT v FROM Voucher v
        WHERE v.status = 'ACTIVE'
          AND v.startAt <= :now
          AND v.endAt >= :now
          AND (v.totalLimit IS NULL OR v.totalLimit <= 0 OR v.usedCount < v.totalLimit)
          AND (
               (:storeId IS NOT NULL AND (v.scope = 'ALL' OR (v.scope = 'STORE' AND v.storeId = :storeId)))
            OR (:storeId IS NULL AND v.scope = 'ALL')
          )
        ORDER BY v.id DESC
    """)
    List<Voucher> findAvailableVouchers(@Param("now") Instant now, @Param("storeId") Long storeId);

    /**
     * Flexible filter for admin and manager views.
     */
    @Query("""
        SELECT v FROM Voucher v
        WHERE (:scope IS NULL OR v.scope = :scope)
          AND (:storeId IS NULL OR v.storeId = :storeId)
          AND (:status IS NULL OR v.status = :status)
          AND (
               :keyword IS NULL
            OR LOWER(v.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(v.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        ORDER BY v.id DESC
    """)
    List<Voucher> findWithFilters(
        @Param("scope") VoucherScope scope,
        @Param("storeId") Long storeId,
        @Param("status") VoucherStatus status,
        @Param("keyword") String keyword
    );
}
