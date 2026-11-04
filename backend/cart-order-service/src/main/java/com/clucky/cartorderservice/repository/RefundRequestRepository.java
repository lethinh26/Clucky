package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {
    Optional<RefundRequest> findByIdAndCustomerId(Long id, Long customerId);
}
