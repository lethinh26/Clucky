package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.DailyStoreStats;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DailyStoreStatsRepository extends JpaRepository<DailyStoreStats, Long> {
    Optional<DailyStoreStats> findByIdAndStoreId(Long id, Long storeId);
}
