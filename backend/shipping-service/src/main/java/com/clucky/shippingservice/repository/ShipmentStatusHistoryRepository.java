package com.clucky.shippingservice.repository;

import com.clucky.shippingservice.entity.ShipmentStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShipmentStatusHistoryRepository extends JpaRepository<ShipmentStatusHistory, Long> {

}
