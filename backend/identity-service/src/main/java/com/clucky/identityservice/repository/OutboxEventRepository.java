package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.OutboxEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, String> {
    @Query(value = "select * from identity_service.outbox_events where published_at is null order by occurred_at asc limit 50", nativeQuery = true)
    List<OutboxEvent> findNextUnpublished();
}
