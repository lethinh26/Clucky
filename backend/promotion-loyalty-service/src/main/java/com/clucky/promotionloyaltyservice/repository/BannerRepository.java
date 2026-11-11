package com.clucky.promotionloyaltyservice.repository;

import com.clucky.promotionloyaltyservice.entity.Banner;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BannerRepository extends JpaRepository<Banner, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Banner b WHERE b.id = :id")
    Optional<Banner> findByIdWithLock(@Param("id") Long id);

    @Query("""
        SELECT b FROM Banner b
        WHERE b.isActive = true
          AND (b.startAt IS NULL OR b.startAt <= :now)
          AND (b.endAt IS NULL OR b.endAt >= :now)
          AND (:position IS NULL OR b.position = :position)
        ORDER BY b.displayOrder ASC, b.id DESC
    """)
    List<Banner> findActiveBanners(@Param("now") Instant now, @Param("position") String position);

    @Query("""
        SELECT b FROM Banner b
        WHERE (:position IS NULL OR b.position = :position)
          AND (:isActive IS NULL OR b.isActive = :isActive)
          AND (:keyword IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY b.displayOrder ASC, b.id DESC
    """)
    List<Banner> findAdminBanners(
            @Param("position") String position,
            @Param("isActive") Boolean isActive,
            @Param("keyword") String keyword);
}
