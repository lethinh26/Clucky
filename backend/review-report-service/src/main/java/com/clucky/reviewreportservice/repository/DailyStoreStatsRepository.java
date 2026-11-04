package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.DailyStoreStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyStoreStatsRepository extends JpaRepository<DailyStoreStats, Long> {

    Optional<DailyStoreStats> findByIdAndStoreId(Long id, Long storeId);

    Optional<DailyStoreStats> findByStoreIdAndStatDate(Long storeId, LocalDate statDate);

    List<DailyStoreStats> findByStoreIdAndStatDateBetweenOrderByStatDateAsc(Long storeId, LocalDate from, LocalDate to);

    List<DailyStoreStats> findByStatDateBetweenOrderByStatDateAsc(LocalDate from, LocalDate to);
}
