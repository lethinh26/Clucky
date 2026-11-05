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
        INSERT INTO review_report_service.daily_store_stats (store_id, stat_date, order_count, revenue, cod_amount, transfer_amount)
        VALUES (:storeId, :statDate, :orderCount, :revenue, :codAmount, :transferAmount)
        ON CONFLICT (store_id, stat_date)
        DO UPDATE SET
            order_count = review_report_service.daily_store_stats.order_count + EXCLUDED.order_count,
            revenue = review_report_service.daily_store_stats.revenue + EXCLUDED.revenue,
            cod_amount = review_report_service.daily_store_stats.cod_amount + EXCLUDED.cod_amount,
            transfer_amount = review_report_service.daily_store_stats.transfer_amount + EXCLUDED.transfer_amount
        """, nativeQuery = true)
    int upsertStatsDelta(
            @Param("storeId") Long storeId,
            @Param("statDate") LocalDate statDate,
            @Param("orderCount") int orderCount,
            @Param("revenue") BigDecimal revenue,
            @Param("codAmount") BigDecimal codAmount,
            @Param("transferAmount") BigDecimal transferAmount
    );
}
