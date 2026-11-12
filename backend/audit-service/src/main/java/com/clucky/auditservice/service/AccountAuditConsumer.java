package com.clucky.auditservice.service;

import com.clucky.auditservice.mapper.AuditMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Set;

@Service
@EnableKafka
public class AccountAuditConsumer {
    public static final Set<String> ALLOWED_SOURCES = Set.of(
        "identity-service", "cart-order-service", "payment-service", 
        "review-report-service", "catalog-store-service", 
        "promotion-loyalty-service", "notification-service", "shipping-service"
    );
    
    private final ObjectMapper mapper;
    private final JdbcTemplate jdbc;
    
    public AccountAuditConsumer(ObjectMapper mapper, JdbcTemplate jdbc) { 
        this.mapper = mapper; 
        this.jdbc = jdbc; 
    }
    
    @KafkaListener(topics = "audit.recorded", groupId = "clucky-account-audit-v1")
    public void receive(String json, Acknowledgment acknowledgment) {
        try {
            var event = mapper.reader()
                    .with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .with(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION).readTree(json);
            String source = event.path("sourceService").asText();
            if (!ALLOWED_SOURCES.contains(source)) {
                acknowledgment.acknowledge(); 
                return;
            }
            var payload = event.path("payload");
            if (!event.path("eventId").asText().matches("[A-Za-z0-9._-]{1,160}")
                    || !event.path("correlationId").asText().matches("[A-Za-z0-9._-]{1,128}")
                    || !"audit.recorded".equals(event.path("eventType").asText())
                    || !positiveId(payload.path("actorId"))
                    || !positiveId(payload.path("targetId"))
                    || payload.hasNonNull("storeId") && !positiveId(payload.path("storeId"))
                    || !payload.path("targetType").asText().matches("[A-Za-z][A-Za-z0-9_:-]{0,99}")
                    || !Set.of("ADMIN", "STORE_MANAGER", "STAFF", "CUSTOMER").contains(payload.path("actorRole").asText())
                    || !payload.path("action").asText().matches("[A-Z_]{1,100}")) 
                throw new IllegalArgumentException("Invalid audit event structure");
            
            jdbc.update("INSERT INTO audit_service.audit_logs(event_id,correlation_id,source_service,actor_id,actor_role,store_id,action,target_type,target_id,detail,occurred_at) "
                    + "VALUES (?,?,?,?,?,?,?,?,?,?::jsonb,?) ON CONFLICT(event_id) DO NOTHING",
                    event.path("eventId").asText(), 
                    event.path("correlationId").asText(), 
                    source,
                    payload.path("actorId").asLong(), 
                    payload.path("actorRole").asText(), 
                    payload.hasNonNull("storeId") ? payload.path("storeId").asLong() : null,
                    payload.path("action").asText(), 
                    payload.path("targetType").asText(), 
                    payload.path("targetId").asLong(),
                    new AuditMapper().safeDetail(payload.hasNonNull("detail") ? payload.path("detail") : payload).toString(),
                    Timestamp.from(Instant.parse(event.path("occurredAt").asText())));
            acknowledgment.acknowledge();
        } catch (Exception failure) { 
            throw new IllegalStateException("Audit persistence pending"); 
        }
    }

    private static boolean positiveId(JsonNode value) {
        return value.isIntegralNumber() && value.canConvertToLong() && value.longValue() > 0;
    }
}
