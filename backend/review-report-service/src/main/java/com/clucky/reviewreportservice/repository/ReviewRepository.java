package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long>, JpaSpecificationExecutor<Review> {

    Optional<Review> findByIdAndCustomerId(Long id, Long customerId);

    List<Review> findByProductIdAndStatusOrderByCreatedAtDesc(Long productId, ReviewStatus status);

    Page<Review> findByProductIdAndStatus(Long productId, ReviewStatus status, Pageable pageable);

    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Review> findByCustomerIdAndStatusNotOrderByCreatedAtDesc(Long customerId, ReviewStatus status);

    Optional<Review> findByCustomerIdAndOrderIdAndProductId(Long customerId, Long orderId, Long productId);

    boolean existsByCustomerIdAndOrderIdAndProductId(Long customerId, Long orderId, Long productId);

    List<Review> findByStoreIdIsNull();

    long countByStatus(ReviewStatus status);

    long countByStoreIdAndStatus(Long storeId, ReviewStatus status);

    long countByStatusNot(ReviewStatus status);

    long countByStoreIdAndStatusNot(Long storeId, ReviewStatus status);

    @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM Review r WHERE r.status = :status")
    Double averageRatingByStatus(@Param("status") ReviewStatus status);

    @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM Review r WHERE r.storeId = :storeId AND r.status = :status")
    Double averageRatingByStoreIdAndStatus(@Param("storeId") Long storeId, @Param("status") ReviewStatus status);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.status = com.clucky.reviewreportservice.entity.ReviewStatus.VISIBLE AND r.replies IS EMPTY")
    long countUnrepliedVisible();

    @Query("SELECT COUNT(r) FROM Review r WHERE r.storeId = :storeId AND r.status = com.clucky.reviewreportservice.entity.ReviewStatus.VISIBLE AND r.replies IS EMPTY")
    long countUnrepliedVisibleByStoreId(@Param("storeId") Long storeId);
}
