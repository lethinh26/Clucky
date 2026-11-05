package com.clucky.cartorderservice.repository;

import com.clucky.cartorderservice.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {
    List<OutboxEvent> findTop50ByStatusOrderByCreatedAtAsc(String status);
    Optional<OutboxEvent> findByEventId(String eventId);
}
