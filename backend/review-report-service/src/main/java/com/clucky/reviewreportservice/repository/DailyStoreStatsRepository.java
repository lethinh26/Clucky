package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.DailyStoreStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyStoreStatsRepository extends JpaRepository<DailyStoreStats, Long> {

    Optional<DailyStoreStats> findByIdAndStoreId(Long id, Long storeId);

    Optional<DailyStoreStats> findByStoreIdAndStatDate(Long storeId, LocalDate statDate);

    List<DailyStoreStats> findByStoreIdAndStatDateBetweenOrderByStatDateAsc(Long storeId, LocalDate from, LocalDate to);

    List<DailyStoreStats> findByStatDateBetweenOrderByStatDateAsc(LocalDate from, LocalDate to);

    @Modifying
    @Query(value = """
        INSERT INTO review_report_service.daily_store_stats
            (store_id, stat_date, order_count, revenue, cod_amount, transfer_amount, updated_at)
        VALUES (:storeId, :statDate, :orderCount, :revenue, :codAmount, :transferAmount, now())
        ON CONFLICT (store_id, stat_date)
        DO UPDATE SET
            order_count = review_report_service.daily_store_stats.order_count + EXCLUDED.order_count,
            revenue = review_report_service.daily_store_stats.revenue + EXCLUDED.revenue,
            cod_amount = review_report_service.daily_store_stats.cod_amount + EXCLUDED.cod_amount,
            transfer_amount = review_report_service.daily_store_stats.transfer_amount + EXCLUDED.transfer_amount,
            updated_at = now()
        """, nativeQuery = true)
    int upsertStatsDelta(
            @Param("storeId") Long storeId,
            @Param("statDate") LocalDate statDate,
            @Param("orderCount") int orderCount,
            @Param("revenue") BigDecimal revenue,
            @Param("codAmount") BigDecimal codAmount,
            @Param("transferAmount") BigDecimal transferAmount
    );

    @Modifying
    @Query(value = """
        INSERT INTO review_report_service.daily_store_stats
            (store_id, stat_date, order_count, revenue, cod_amount, transfer_amount,
             reconciled_transfer_amount, pending_reconciliation_amount, excess_amount, expired_receipt_amount, updated_at)
        VALUES (:storeId, :statDate, 0, 0, 0, 0,
                :reconciledTransferDelta, :pendingReconciliationDelta, :excessDelta, :expiredReceiptDelta, now())
        ON CONFLICT (store_id, stat_date)
        DO UPDATE SET
            reconciled_transfer_amount = GREATEST(0, review_report_service.daily_store_stats.reconciled_transfer_amount + EXCLUDED.reconciled_transfer_amount),
            pending_reconciliation_amount = GREATEST(0, review_report_service.daily_store_stats.pending_reconciliation_amount + EXCLUDED.pending_reconciliation_amount),
            excess_amount = review_report_service.daily_store_stats.excess_amount + EXCLUDED.excess_amount,
            expired_receipt_amount = review_report_service.daily_store_stats.expired_receipt_amount + EXCLUDED.expired_receipt_amount,
            updated_at = now()
        """, nativeQuery = true)
    int upsertReconciliationDelta(
            @Param("storeId") Long storeId,
            @Param("statDate") LocalDate statDate,
            @Param("reconciledTransferDelta") BigDecimal reconciledTransferDelta,
            @Param("pendingReconciliationDelta") BigDecimal pendingReconciliationDelta,
            @Param("excessDelta") BigDecimal excessDelta,
            @Param("expiredReceiptDelta") BigDecimal expiredReceiptDelta
    );
}
