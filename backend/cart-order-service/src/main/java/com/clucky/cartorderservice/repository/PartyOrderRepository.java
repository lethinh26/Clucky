package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.PartyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PartyOrderRepository extends JpaRepository<PartyOrder, Long> {
    Optional<PartyOrder> findByIdAndCustomerId(Long id, Long customerId);
    Optional<PartyOrder> findByIdAndStoreId(Long id, Long storeId);
}
