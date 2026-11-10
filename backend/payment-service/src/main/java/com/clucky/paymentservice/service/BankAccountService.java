package com.clucky.paymentservice.service;

import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.BankAccountData.*;
import com.clucky.paymentservice.dto.DomainEvent;
import com.clucky.paymentservice.dto.Role;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class BankAccountService {
    private static final RowMapper<Account> ACCOUNT = (row, index) -> new Account(row.getLong("id"),
            row.getString("bank_name"), row.getString("bank_code"), row.getString("account_no"),
            row.getString("account_name"), row.getBoolean("is_active"), row.getLong("version"));
    private static final RowMapper<Assignment> ASSIGNMENT = (row, index) -> new Assignment(
            row.getLong("store_id"), row.getObject("bank_account_id", Long.class), row.getLong("version"));
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final DiscoveryClient discovery;
    private final RestClient catalog;
    private final boolean keyConfigured;

    public BankAccountService(JdbcTemplate jdbc, ObjectMapper mapper, DiscoveryClient discovery,
            RestClient.Builder builder, @Value("${payment.sepay.api-key:}") String key) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.discovery = discovery;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.catalog = builder.requestFactory(factory).build();
        this.keyConfigured = !key.isBlank();
    }

    @Transactional(readOnly = true)
    public Overview list() {
        requireAdmin();
        return new Overview(jdbc.query("SELECT * FROM payment_service.bank_accounts_config ORDER BY id", ACCOUNT),
                jdbc.query("SELECT * FROM payment_service.store_bank_accounts ORDER BY store_id", ASSIGNMENT),
                keyConfigured, true);
    }

    @Transactional
    public Account save(Long id, Details request, UUID key) {
        CurrentActor actor = requireAdmin();
        Details details = new Details(request.bankName().strip(), request.bankCode().toUpperCase(Locale.ROOT),
                request.accountNo(), request.accountName().strip(), request.active(), request.version());
        String hash = hash("account:" + id, details);
        lock();
        Account replay = replay(actor, key, hash, Account.class);
        if (replay != null) return replay;
        Account result;
        if (id == null) {
            if (details.version() != 0) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            result = jdbc.queryForObject("INSERT INTO payment_service.bank_accounts_config "
                    + "(bank_name,bank_code,account_no,account_name,is_active) VALUES (?,?,?,?,?) RETURNING *", ACCOUNT,
                    details.bankName(), details.bankCode(), details.accountNo(), details.accountName(), details.active());
        } else {
            account(id);
            List<Account> updated = jdbc.query("UPDATE payment_service.bank_accounts_config SET bank_name=?,bank_code=?,"
                    + "account_no=?,account_name=?,is_active=?,version=version+1 WHERE id=? AND version=? RETURNING *", ACCOUNT,
                    details.bankName(), details.bankCode(), details.accountNo(), details.accountName(), details.active(), id, details.version());
            if (updated.isEmpty()) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            result = updated.getFirst();
        }
        record(actor, key, hash, result, id == null ? "BANK_ACCOUNT_CREATED" : "BANK_ACCOUNT_UPDATED",
                "BANK_ACCOUNT", result.id(), null, result.version(), null);
        return result;
    }

    public List<Bank> banks() {
        requireAdmin();
        try {
            return parseBanks(catalog.get().uri("https://qr.sepay.vn/banks.json").retrieve().body(JsonNode.class));
        } catch (RestClientException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    static List<Bank> parseBanks(JsonNode response) {
        JsonNode data = response == null ? null : response.path("data");
        if (data == null || !data.isArray() || data.isEmpty() || data.size() > 200) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        List<Bank> banks = new ArrayList<>();
        var codes = new HashSet<String>();
        for (JsonNode entry : data) {
            if (!entry.path("name").isTextual() || !entry.path("short_name").isTextual()
                    || !entry.path("code").isTextual() || !entry.path("bin").isTextual()) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            Bank bank = new Bank(entry.path("name").asText().strip(), entry.path("short_name").asText().strip(),
                    entry.path("code").asText().toUpperCase(Locale.ROOT), entry.path("bin").asText());
            if (bank.name().isBlank() || bank.name().length() > 200 || bank.shortName().isBlank() || bank.shortName().length() > 100
                    || !bank.code().matches("[A-Z0-9]{2,20}") || !bank.bin().matches("[0-9]{6}")
                    || !codes.add(bank.code())) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            banks.add(bank);
        }
        return List.copyOf(banks);
    }

    @Transactional
    public Assignment assign(long storeId, AssignmentRequest request, UUID key) {
        CurrentActor actor = requireAdmin();
        String hash = hash("assignment:" + storeId, request);
        lock();
        Assignment replay = replay(actor, key, hash, Assignment.class);
        if (replay != null) return replay;
        verifyStore(storeId);
        if (request.bankAccountId() != null) {
            Account selected = account(request.bankAccountId());
            if (!selected.active() || selected.bankCode() == null) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        List<Assignment> existing = jdbc.query("SELECT * FROM payment_service.store_bank_accounts WHERE store_id=?",
                ASSIGNMENT, storeId);
        Assignment current = existing.isEmpty() ? new Assignment(storeId, null, 0) : existing.getFirst();
        if (current.version() != request.version()) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        jdbc.update("INSERT INTO payment_service.store_bank_accounts(store_id,bank_account_id,version) VALUES (?,?,1) "
                + "ON CONFLICT(store_id) DO UPDATE SET bank_account_id=EXCLUDED.bank_account_id,"
                + "version=store_bank_accounts.version+1,updated_at=now()", storeId, request.bankAccountId());
        Assignment result = new Assignment(storeId, request.bankAccountId(), current.version() + 1);
        record(actor, key, hash, result, "BANK_ACCOUNT_ASSIGNED", "STORE", storeId, storeId, result.version(), current.bankAccountId());
        return result;
    }

    private Account account(long id) {
        return jdbc.query("SELECT * FROM payment_service.bank_accounts_config WHERE id=?", ACCOUNT, id)
                .stream().findFirst().orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private void verifyStore(long storeId) {
        var instances = discovery.getInstances("catalog-store-service");
        if (instances.isEmpty()) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        var token = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        try {
            JsonNode store = catalog.get().uri(instances.getFirst().getUri().resolve("/api/stores/" + storeId))
                    .headers(headers -> headers.setBearerAuth(token.getToken().getTokenValue())).retrieve().body(JsonNode.class);
            if (store == null || store.path("id").asLong() != storeId) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        } catch (RestClientResponseException failure) {
            throw new ApiException(failure.getStatusCode().value() == 404 ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (RestClientException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    private CurrentActor requireAdmin() {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) throw new AccessDeniedException("Access denied");
        return actor;
    }

    private void lock() { jdbc.execute("SELECT pg_advisory_xact_lock(192616)"); }

    private <Result> Result replay(CurrentActor actor, UUID key, String hash, Class<Result> type) {
        var records = jdbc.queryForList("SELECT request_hash,response::text FROM payment_service.bank_operations "
                + "WHERE actor_id=? AND operation_key=?", actor.userId(), key);
        if (records.isEmpty()) return null;
        var record = records.getFirst();
        if (!hash.equals(record.get("request_hash"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        try { return mapper.readValue((String) record.get("response"), type); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Invalid operation response"); }
    }

    private void record(CurrentActor actor, UUID key, String hash, Object result, String action,
            String targetType, long targetId, Long storeId, long version, Long previousAccountId) {
        jdbc.update("INSERT INTO payment_service.bank_operations(actor_id,operation_key,request_hash,response) VALUES (?,?,?,?::jsonb)",
                actor.userId(), key, hash, json(result));
        var payload = mapper.createObjectNode().put("actorId", actor.userId()).put("actorRole", actor.role().name())
                .put("action", action).put("targetType", targetType).put("targetId", targetId);
        if (storeId != null) payload.put("storeId", storeId);
        var token = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        var detail = payload.putObject("detail").put("result", "SUCCESS").put("version", version)
                .put("sessionId", token.getToken().getClaimAsString("sid"));
        if (result instanceof Account changed) detail.put("active", changed.active());
        if (result instanceof Assignment assigned) {
            detail.put("bankAccountId", assigned.bankAccountId());
            detail.put("previousBankAccountId", previousAccountId);
        }
        UUID eventId = UUID.randomUUID();
        String correlation = MDC.get("correlationId");
        if (correlation == null || !correlation.matches("[A-Za-z0-9._-]{1,128}")) correlation = UUID.randomUUID().toString();
        var event = new DomainEvent(eventId.toString(), correlation, "audit.recorded", "payment-service", Instant.now(), payload);
        jdbc.update("INSERT INTO payment_service.bank_audit_outbox(event_id,event) VALUES (?,?::jsonb)", eventId, json(event));
    }

    private String hash(String operation, Object request) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((operation + ":" + json(request)).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException failure) { throw new IllegalStateException(failure); }
    }

    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot serialize bank operation"); }
    }
}
