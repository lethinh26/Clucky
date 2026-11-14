package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.config.CurrentActor;
import com.clucky.catalogstoreservice.config.JwtSettings;
import com.clucky.catalogstoreservice.dto.StoreDto;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
@EnableScheduling
public class BranchProvisioning {
    private final JdbcTemplate jdbc;
    private final StoreService stores;
    private final CatalogCacheService cache;
    private final DiscoveryClient discovery;
    private final ObjectMapper mapper;
    private final JwtSettings settings;
    private final TransactionTemplate transactions;
    private final RestClient client;
    private final CatalogEvents events;

    public BranchProvisioning(JdbcTemplate jdbc, StoreService stores, CatalogCacheService cache, DiscoveryClient discovery,
            ObjectMapper mapper, JwtSettings settings, TransactionTemplate transactions, CatalogEvents events) {
        this.jdbc = jdbc; this.stores = stores; this.cache = cache; this.discovery = discovery;
        this.mapper = mapper; this.settings = settings; this.transactions = transactions;
        this.events = events;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000); factory.setReadTimeout(5000);
        client = RestClient.builder().requestFactory(factory).build();
    }

    private String sign(String value) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(settings.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception failure) { throw new ApiException(ErrorCode.INTERNAL_ERROR); }
    }

    @Transactional
    public StoreDto.Response create(StoreDto.Request request, UUID key) {
        var actor = CurrentActor.require();
        if (!"ADMIN".equals(actor.role().name())) throw new ApiException(ErrorCode.FORBIDDEN);
        if (request.getRecoveryEmail() == null || request.getRecoveryEmail().isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String hash;
        try { hash = sign(actor.userId() + ":" + mapper.writeValueAsString(request)); }
        catch (Exception failure) { throw new ApiException(ErrorCode.VALIDATION_ERROR); }
        jdbc.execute("SELECT pg_advisory_xact_lock(192616)");
        var existing = jdbc.queryForList("SELECT store_id,request_hash FROM catalog_service.account_provisioning WHERE request_key=?", key);
        if (!existing.isEmpty()) {
            if (!hash.equals(existing.getFirst().get("request_hash"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            return stores.getStoreById(((Number) existing.getFirst().get("store_id")).longValue());
        }
        request.setStatus("CLOSED_TEMP");
        var store = stores.createStore(request);
        jdbc.update("UPDATE catalog_service.stores SET account_readiness='PENDING' WHERE id=?", store.getId());
        String session = ((JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication()).getToken().getClaimAsString("sid");
        if (session == null) throw new ApiException(ErrorCode.UNAUTHENTICATED);
        jdbc.update("INSERT INTO catalog_service.account_provisioning(store_id,request_key,request_hash,recovery_email,actor_id,session_id,correlation_id) VALUES (?,?,?,?,?,?,?)",
                store.getId(), key, hash, request.getRecoveryEmail().trim().toLowerCase(Locale.ROOT), actor.userId(), session, UUID.randomUUID().toString());
        store.setAccountReadiness("PENDING");
        return store;
    }

    public Map<String, Object> status(long storeId) {
        var store = stores.getStoreById(storeId);
        var rows = jdbc.queryForList("SELECT last_error FROM catalog_service.account_provisioning WHERE store_id=?", storeId);
        return Map.of("storeId", storeId, "readiness", store.getAccountReadiness(), "error",
                rows.isEmpty() || rows.getFirst().get("last_error") == null ? "" : rows.getFirst().get("last_error"));
    }

    public Long managerUserId(long storeId) {
        return jdbc.queryForObject("SELECT notification_manager_id FROM catalog_service.stores WHERE id=?", Long.class, storeId);
    }

    @Transactional
    public Map<String, Object> retry(long storeId) {
        synchronize(storeId);
        var result = status(storeId);
        events.audit("BRANCH_PROVISIONING_RETRIED", "Store", storeId, storeId);
        return result;
    }

    @Scheduled(fixedDelayString = "${clucky.branch.poll-ms:10000}")
    public void poll() {
        for (Long storeId : jdbc.queryForList("SELECT id FROM catalog_service.stores ORDER BY id", Long.class)) {
            try { synchronize(storeId); } catch (RuntimeException ignored) { }
        }
    }

    public void synchronize(long storeId) {
        transactions.executeWithoutResult(status -> {
            var rows = jdbc.queryForList("SELECT account_readiness FROM catalog_service.stores WHERE id=? FOR UPDATE SKIP LOCKED", storeId);
            if (rows.isEmpty()) return;
            var jobs = jdbc.queryForList("SELECT * FROM catalog_service.account_provisioning WHERE store_id=?", storeId);
            String body = "";
            boolean provision = !jobs.isEmpty() && "PENDING".equals(rows.getFirst().get("account_readiness"));
            try {
                var instances = discovery.getInstances("identity-service");
                if (instances.isEmpty()) throw new IllegalStateException();
                if (provision) {
                    var job = jobs.getFirst();
                    body = mapper.writeValueAsString(Map.of("requestKey", job.get("request_key"), "recoveryEmail", job.get("recovery_email"),
                            "actorId", job.get("actor_id"), "sessionId", job.get("session_id"), "correlationId", job.get("correlation_id")));
                }
                long time = Instant.now().getEpochSecond();
                String uri = instances.getFirst().getUri() + "/api/auth/internal/branch-accounts/" + storeId;
                String signature = sign("branch-provision-v1:" + storeId + ":" + time + ":" + body);
                JsonNode pair = provision ? client.put().uri(uri).header("X-Branch-Time", "" + time).header("X-Branch-Signature", signature)
                        .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class)
                        : client.get().uri(uri).header("X-Branch-Time", "" + time).header("X-Branch-Signature", signature).retrieve().body(JsonNode.class);
                if (pair == null || pair.path("storeId").asLong() != storeId || pair.path("accounts").size() != 2) throw new IllegalStateException();
                Set<String> roles = new HashSet<>(); Set<Long> ids = new HashSet<>(); boolean ready = true;
                Long managerUserId = null;
                for (JsonNode account : pair.path("accounts")) {
                    if (account.path("storeId").asLong() != storeId || !account.path("current").asBoolean() || account.path("id").asLong() <= 0) throw new IllegalStateException();
                    roles.add(account.path("role").asText()); ids.add(account.path("id").asLong());
                    ready &= account.path("activated").asBoolean() && "ACTIVE".equals(account.path("status").asText());
                    if ("STORE_MANAGER".equals(account.path("role").asText()) && account.path("activated").asBoolean()
                            && "ACTIVE".equals(account.path("status").asText())) managerUserId = account.path("id").asLong();
                }
                if (ids.size() != 2 || !roles.equals(Set.of("STAFF", "STORE_MANAGER"))) throw new IllegalStateException();
                jdbc.update("UPDATE catalog_service.stores SET notification_manager_id=? WHERE id=?", managerUserId, storeId);
                // Operational OPEN/CLOSED_TEMP/INACTIVE is owned by Manager/Admin.
                // A temporarily unavailable or disabled Identity account must only
                // affect readiness; StoreService.isStoreServingNow checks both fields.
                // Otherwise a brief Identity outage permanently closes an OPEN store.
                jdbc.update("UPDATE catalog_service.stores SET version=version+1,account_readiness=? "
                                + "WHERE id=? AND account_readiness<>?",
                        ready ? "READY" : "PROVISIONED", storeId, ready ? "READY" : "PROVISIONED");
                jdbc.update("UPDATE catalog_service.account_provisioning SET last_error=NULL,updated_at=now() WHERE store_id=?", storeId);
                cache.evictStoreMenuCache(storeId);
            } catch (Exception failure) {
                jdbc.update("UPDATE catalog_service.stores SET notification_manager_id=NULL WHERE id=?", storeId);
                boolean missing = jobs.isEmpty() && failure instanceof RestClientResponseException response && response.getStatusCode().value() == 404;
                jdbc.update("UPDATE catalog_service.account_provisioning SET last_error='IDENTITY_PROVISIONING_PENDING',updated_at=now() WHERE store_id=?", storeId);
                // Keep the intended operating status intact. Readiness alone gates
                // new orders while Identity verification is unavailable.
                jdbc.update("UPDATE catalog_service.stores SET version=version+1,"
                        + "account_readiness=CASE WHEN ? THEN 'UNPROVISIONED' WHEN account_readiness='READY' THEN 'PROVISIONED' ELSE account_readiness END "
                        + "WHERE id=? AND (account_readiness='READY' OR (? AND account_readiness<>'UNPROVISIONED'))", missing, storeId, missing);
                cache.evictStoreMenuCache(storeId);
            }
        });
    }

}
