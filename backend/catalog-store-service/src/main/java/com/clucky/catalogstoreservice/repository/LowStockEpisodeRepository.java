package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.LowStockEpisode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LowStockEpisodeRepository extends JpaRepository<LowStockEpisode, Long> {
    Optional<LowStockEpisode> findByStoreIdAndProductIdAndStatus(Long storeId, Long productId, String status);
    List<LowStockEpisode> findByStoreIdAndStatus(Long storeId, String status);
}

