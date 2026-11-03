package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByIdAndCustomerId(Long id, Long customerId);
    Optional<Order> findByIdAndStoreId(Long id, Long storeId);
}
