package com.clucky.shippingservice.repository;

import com.clucky.shippingservice.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByIdAndStoreId(Long id, Long storeId);
    Optional<Shipment> findByOrderId(Long orderId);
}
