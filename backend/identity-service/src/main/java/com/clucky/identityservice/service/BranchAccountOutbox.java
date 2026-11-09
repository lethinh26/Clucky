package com.clucky.identityservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@EnableScheduling
public class BranchAccountOutbox {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final BranchAccountService accounts;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transactions;
    public BranchAccountOutbox(JdbcTemplate jdbc, ObjectMapper mapper, BranchAccountService accounts,
            KafkaTemplate<String, String> kafka, PlatformTransactionManager manager) {
        this.jdbc = jdbc; this.mapper = mapper; this.accounts = accounts; this.kafka = kafka;
        this.transactions = new TransactionTemplate(manager);
    }
    private void send(String topic, String id, String correlation, Object payload) throws Exception {
        ProducerRecord<String, String> record = new ProducerRecord<>(topic, id, mapper.writeValueAsString(payload));
        record.headers().add("X-Event-ID", id.getBytes(StandardCharsets.UTF_8));
        record.headers().add("X-Correlation-ID", correlation.getBytes(StandardCharsets.UTF_8));
        kafka.send(record).get(10, TimeUnit.SECONDS);
    }
    @Scheduled(fixedDelayString = "${clucky.branch.outbox-delay-ms:5000}")
    public void publish() {
        try {
            transactions.executeWithoutResult(transaction -> {
                var challenges = jdbc.queryForList("SELECT * FROM identity_service.branch_challenges WHERE NOT used AND expires_at>now() "
                        + "AND (NOT sent_primary OR (new_email IS NOT NULL AND NOT sent_secondary)) ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED");
                for (var row : challenges) {
                    UUID id = (UUID) row.get("id");
                    for (String channel : new String[] { "primary", "secondary" }) {
                        if (Boolean.TRUE.equals(row.get("sent_" + channel)) || channel.equals("secondary") && row.get("new_email") == null) continue;
                        String eventId = id + "." + channel;
                        String recipient = row.get(channel.equals("primary") ? "recipient" : "new_email").toString();
                        var target = jdbc.queryForMap("SELECT COALESCE(login_name,email) AS login,role FROM identity_service.users WHERE id=?", row.get("target_id"));
                        var variables = Map.of("otp", accounts.code(id, channel), "challengeId", id.toString(),
                                "purpose", row.get("purpose").toString(), "accountId", row.get("target_id").toString(),
                                "login", target.get("login").toString(), "role", target.get("role").toString(),
                                "expiresAt", ((Timestamp) row.get("expires_at")).toInstant().toString());
                        try { send("identity.branch-email", eventId, id.toString(), Map.of("messageId", eventId, "eventId", eventId,
                                "correlationId", id.toString(), "recipient", recipient, "template", "branch-security", "variables", variables)); }
                        catch (Exception failure) { throw new IllegalStateException("Branch email pending"); }
                        jdbc.update("UPDATE identity_service.branch_challenges SET sent_" + channel + "=TRUE WHERE id=?", id);
                    }
                }
            });
            transactions.executeWithoutResult(transaction -> {
                var events = jdbc.queryForList("SELECT * FROM identity_service.branch_outbox WHERE NOT published ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED");
                for (var row : events) {
                    String eventId = row.get("event_id").toString();
                    try { send("audit.recorded", eventId, row.get("correlation_id").toString(), Map.of(
                            "eventId", eventId, "correlationId", row.get("correlation_id"), "eventType", "audit.recorded",
                            "sourceService", "identity-service", "occurredAt", ((Timestamp) row.get("created_at")).toInstant().toString(),
                            "payload", mapper.readTree(row.get("payload").toString()))); }
                    catch (Exception failure) { throw new IllegalStateException("Branch audit pending"); }
                    jdbc.update("UPDATE identity_service.branch_outbox SET published=TRUE WHERE event_id=?", row.get("event_id"));
                }
            });
        } catch (RuntimeException failure) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("event=branch_outbox_pending");
        }
    }
}
