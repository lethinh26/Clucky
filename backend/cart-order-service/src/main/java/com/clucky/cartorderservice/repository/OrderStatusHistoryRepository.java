package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {

}
