package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.PartyOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PartyOrderRepository extends JpaRepository<PartyOrder, Long> {
    Optional<PartyOrder> findByIdAndCustomerId(Long id, Long customerId);
    Optional<PartyOrder> findByIdAndStoreId(Long id, Long storeId);

    Page<PartyOrder> findByCustomerIdOrderByIdDesc(Long customerId, Pageable pageable);

    @Query("""
        SELECT p FROM PartyOrder p
        WHERE (:storeId IS NULL OR p.storeId = :storeId)
          AND (:status IS NULL OR p.status = :status)
        ORDER BY p.id DESC
    """)
    Page<PartyOrder> findPartyOrders(
        @Param("storeId") Long storeId,
        @Param("status") String status,
        Pageable pageable
    );
}
