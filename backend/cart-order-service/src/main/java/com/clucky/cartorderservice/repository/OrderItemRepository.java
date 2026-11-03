package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

}
