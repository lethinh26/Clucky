package com.clucky.auditservice.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Immutable
@Table(name = "audit_logs", schema = "audit_service")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "event_id", nullable = false, unique = true, length = 160)
    private String eventId;
    @Column(name = "correlation_id", length = 160)
    private String correlationId;
    @Column(name = "source_service", nullable = false, length = 100)
    private String sourceService;
    @Column(name = "actor_id", nullable = false)
    private Long actorId;
    @Column(name = "actor_role", nullable = false, length = 30)
    private String actorRole;
    @Column(name = "store_id")
    private Long storeId;
    @Column(nullable = false, length = 100)
    private String action;
    @Column(name = "target_type", nullable = false, length = 100)
    private String targetType;
    @Column(name = "target_id")
    private Long targetId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private JsonNode detail;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AuditLog() {}
    public Long getId() { return id; }
    public String getEventId() { return eventId; }
    public String getCorrelationId() { return correlationId; }
    public String getSourceService() { return sourceService; }
    public Long getActorId() { return actorId; }
    public String getActorRole() { return actorRole; }
    public Long getStoreId() { return storeId; }
    public String getAction() { return action; }
    public String getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public JsonNode getDetail() { return detail; }
    public Instant getOccurredAt() { return occurredAt; }
    public Instant getCreatedAt() { return createdAt; }
}
