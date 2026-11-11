package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Component
public class ReviewIdempotencyStore {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ReviewIdempotencyStore(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper.copy().configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    public String hashRequest(Object payload) {
        try {
            byte[] jsonBytes = mapper.writeValueAsBytes(payload);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(jsonBytes);
            return HexFormat.of().formatHex(digest);
        } catch (JsonProcessingException | NoSuchAlgorithmException failure) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public <T> Optional<T> reserveOrReplay(
            String operation,
            Long actorId,
            Long targetId,
            String idempotencyKey,
            String requestHash,
            Class<T> responseType
    ) {
        int inserted = jdbc.update(
                "INSERT INTO review_report_service.review_idempotency "
                        + "(operation, actor_id, target_id, idempotency_key, request_hash, response_status, response_body) "
                        + "VALUES (?, ?, ?, ?, ?, 0, CAST('null' AS jsonb)) "
                        + "ON CONFLICT (operation, actor_id, idempotency_key) DO NOTHING",
                operation, actorId, targetId, idempotencyKey, requestHash);

        if (inserted > 0) {
            return Optional.empty();
        }

        List<IdempotencyRecord> existing = jdbc.query(
                "SELECT request_hash, response_status, response_body::text AS response_body "
                        + "FROM review_report_service.review_idempotency "
                        + "WHERE operation = ? AND actor_id = ? AND idempotency_key = ?",
                (rs, rowNum) -> new IdempotencyRecord(
                        rs.getString("request_hash"),
                        rs.getInt("response_status"),
                        rs.getString("response_body")),
                operation, actorId, idempotencyKey);

        if (existing.isEmpty()) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        IdempotencyRecord record = existing.get(0);
        if (!requestHash.equals(record.requestHash())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (record.responseStatus() <= 0 || record.responseBody() == null || "null".equals(record.responseBody())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        try {
            return Optional.of(mapper.readValue(record.responseBody().getBytes(StandardCharsets.UTF_8), responseType));
        } catch (Exception failure) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void complete(
            String operation,
            Long actorId,
            String idempotencyKey,
            int responseStatus,
            Object responseBody
    ) {
        if (idempotencyKey == null) {
            return;
        }
        try {
            String json = mapper.writeValueAsString(responseBody);
            jdbc.update(
                    "UPDATE review_report_service.review_idempotency "
                            + "SET response_status = ?, response_body = CAST(? AS jsonb) "
                            + "WHERE operation = ? AND actor_id = ? AND idempotency_key = ?",
                    responseStatus, json, operation, actorId, idempotencyKey);
        } catch (JsonProcessingException failure) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private record IdempotencyRecord(String requestHash, int responseStatus, String responseBody) {}
}
