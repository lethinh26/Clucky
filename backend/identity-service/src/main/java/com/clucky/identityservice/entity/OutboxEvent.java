package com.clucky.identityservice.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "outbox_events", schema = "identity_service")
public class OutboxEvent {
    @Id @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;
    @Column(name = "event_type", nullable = false, length = 100) private String eventType;
    @Column(name = "aggregate_id", nullable = false) private Long aggregateId;
    @Column(name = "correlation_id", nullable = false, length = 128) private String correlationId;
    @Column(name = "payload", nullable = false, columnDefinition = "text") private String payload;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;
    @Column(name = "published_at") private Instant publishedAt;
    @Column(name = "attempts", nullable = false) private int attempts;
    public String getEventId() { return eventId; } public void setEventId(String v) { eventId = v; }
    public String getEventType() { return eventType; } public void setEventType(String v) { eventType = v; }
    public Long getAggregateId() { return aggregateId; } public void setAggregateId(Long v) { aggregateId = v; }
    public String getCorrelationId() { return correlationId; } public void setCorrelationId(String v) { correlationId = v; }
    public String getPayload() { return payload; } public void setPayload(String v) { payload = v; }
    public Instant getOccurredAt() { return occurredAt; } public void setOccurredAt(Instant v) { occurredAt = v; }
    public Instant getPublishedAt() { return publishedAt; } public void setPublishedAt(Instant v) { publishedAt = v; }
    public int getAttempts() { return attempts; } public void setAttempts(int v) { attempts = v; }
}
