package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
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

    default Page<Order> findCustomerOrders(Long customerId, String status, Pageable pageable) {
        Specification<Order> filter = (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("customerId"), customerId));
            if (status != null) predicates.add(builder.equal(root.get("status"), status));
            return builder.and(predicates.toArray(Predicate[]::new));
        };
        return findAll(filter, newestFirst(pageable));
    }

    default Page<Order> findOrdersFiltered(Long customerId, Long storeId, String status, String paymentStatus,
            String orderSource, Instant createdFrom, Instant createdTo, String orderCodePattern, Pageable pageable) {
        return findOrdersFiltered(customerId, storeId, status, paymentStatus, orderSource, createdFrom, createdTo,
                orderCodePattern, null, pageable);
    }

    default Page<Order> findOrdersFiltered(Long customerId, Long storeId, String status, String paymentStatus,
            String orderSource, Instant createdFrom, Instant createdTo, String orderCodePattern,
            Integer queueNumber, Pageable pageable) {
        Specification<Order> filter = (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (customerId != null) predicates.add(builder.equal(root.get("customerId"), customerId));
            if (storeId != null) predicates.add(builder.equal(root.get("storeId"), storeId));
            if (status != null) predicates.add(builder.equal(root.get("status"), status));
            if (paymentStatus != null) predicates.add(builder.equal(root.get("paymentStatus"), paymentStatus));
            if (orderSource != null) predicates.add(builder.equal(root.get("orderSource"), orderSource));
            if (createdFrom != null) predicates.add(builder.greaterThanOrEqualTo(root.<Instant>get("createdAt"), createdFrom));
            if (createdTo != null) predicates.add(builder.lessThan(root.<Instant>get("createdAt"), createdTo));
            if (queueNumber != null) predicates.add(builder.equal(root.get("queueNumber"), queueNumber));
            if (orderCodePattern != null && !"%".equals(orderCodePattern)) {
                predicates.add(builder.like(builder.lower(root.get("orderCode")), orderCodePattern.toLowerCase()));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
        return findAll(filter, newestFirst(pageable));
    }

    private static Pageable newestFirst(Pageable pageable) {
        if (pageable.isUnpaged()) return pageable;
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    }

    @Query("""
        SELECT COALESCE(MAX(o.queueNumber), 0) FROM Order o
        WHERE o.storeId = :storeId
          AND o.createdAt >= :createdFrom
          AND o.createdAt < :createdTo
    """)
    Integer findMaxQueueNumberForStoreAndDate(
        @Param("storeId") Long storeId,
        @Param("createdFrom") java.time.Instant createdFrom,
        @Param("createdTo") java.time.Instant createdTo
    );

}
