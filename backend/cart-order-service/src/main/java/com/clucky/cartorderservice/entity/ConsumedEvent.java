package com.clucky.cartorderservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "consumed_events", schema = "order_service")
public class ConsumedEvent {
    @Id
    @Column(name = "event_id", nullable = false, length = 160)
    private String eventId;
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;
    @Column(name = "consumed_at", nullable = false)
    private Instant consumedAt = Instant.now();
    protected ConsumedEvent() { }
    public ConsumedEvent(String eventId, String eventType) { this.eventId = eventId; this.eventType = eventType; }
}
