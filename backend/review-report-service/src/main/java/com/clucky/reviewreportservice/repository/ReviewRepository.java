package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByIdAndCustomerId(Long id, Long customerId);

    List<Review> findByProductIdAndStatusOrderByCreatedAtDesc(Long productId, ReviewStatus status);

    Page<Review> findByProductIdAndStatus(Long productId, ReviewStatus status, Pageable pageable);

    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<Review> findByCustomerIdAndOrderIdAndProductId(Long customerId, Long orderId, Long productId);

    boolean existsByCustomerIdAndOrderIdAndProductId(Long customerId, Long orderId, Long productId);
}
