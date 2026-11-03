package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByIdAndCustomerId(Long id, Long customerId);
}
