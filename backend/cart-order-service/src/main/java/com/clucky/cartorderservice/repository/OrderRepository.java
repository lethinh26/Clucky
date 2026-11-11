package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT entry FROM Order entry WHERE entry.id = :id")
    Optional<Order> lockById(@Param("id") Long id);
    Optional<Order> findByIdAndCustomerId(Long id, Long customerId);
    Optional<Order> findByIdAndStoreId(Long id, Long storeId);
    Optional<Order> findByOrderCode(String orderCode);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT entry FROM Order entry WHERE entry.orderCode = :code")
    Optional<Order> lockByOrderCode(@Param("code") String code);
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
          AND (LOWER(o.orderCode) LIKE LOWER(:orderCodePattern))
        ORDER BY o.createdAt DESC
    """)
    Page<Order> findOrdersWithCode(
        @Param("storeId") Long storeId,
        @Param("status") String status,
        @Param("orderCodePattern") String orderCodePattern,
        Pageable pageable
    );

    default Page<Order> findOrders(Long storeId, String status, String orderCodePattern, Pageable pageable) {
        if (orderCodePattern != null && !orderCodePattern.isBlank()) {
            return findOrdersWithCode(storeId, status, orderCodePattern.trim(), pageable);
        }
        return findOrdersWithoutCode(storeId, status, pageable);
    }
}
