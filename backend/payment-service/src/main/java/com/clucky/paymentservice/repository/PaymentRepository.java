package com.clucky.paymentservice.repository;

import com.clucky.paymentservice.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    java.util.List<Payment> findByOrderIdOrderByIdDesc(Long orderId);
}
