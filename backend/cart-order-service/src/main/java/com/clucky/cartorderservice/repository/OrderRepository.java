package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByIdAndCustomerId(Long id, Long customerId);
    Optional<Order> findByIdAndStoreId(Long id, Long storeId);
    Optional<Order> findByOrderCode(String orderCode);
    boolean existsByOrderCode(String orderCode);

    @Query("""
        SELECT o FROM Order o
        WHERE o.customerId = :customerId
          AND (:status IS NULL OR o.status = :status)
        ORDER BY o.createdAt DESC
    """)
    Page<Order> findCustomerOrders(
        @Param("customerId") Long customerId,
        @Param("status") String status,
        Pageable pageable
    );

    @Query("""
        SELECT o FROM Order o
        WHERE (:storeId IS NULL OR o.storeId = :storeId)
          AND (:status IS NULL OR o.status = :status)
        ORDER BY o.createdAt DESC
    """)
    Page<Order> findOrdersWithoutCode(
        @Param("storeId") Long storeId,
        @Param("status") String status,
        Pageable pageable
    );

    @Query("""
        SELECT o FROM Order o
        WHERE (:storeId IS NULL OR o.storeId = :storeId)
          AND (:status IS NULL OR o.status = :status)
          AND (LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :orderCode, '%')))
        ORDER BY o.createdAt DESC
    """)
    Page<Order> findOrdersWithCode(
        @Param("storeId") Long storeId,
        @Param("status") String status,
        @Param("orderCode") String orderCode,
        Pageable pageable
    );

    default Page<Order> findOrders(Long storeId, String status, String orderCode, Pageable pageable) {
        if (orderCode != null && !orderCode.isBlank()) {
            return findOrdersWithCode(storeId, status, orderCode.trim(), pageable);
        }
        return findOrdersWithoutCode(storeId, status, pageable);
    }
}
