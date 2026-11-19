package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.RefreshTokenRepository;
import com.clucky.identityservice.repository.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Durable sid ledger. All writes changing capacity serialize on users FOR UPDATE. */
@Service
public class AuthSessionService {
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final SessionRevocationService revocations;
    private final AuthProperties config;
    private final IdentityAuditService audit;

    public AuthSessionService(JdbcTemplate jdbc, UserRepository users, RefreshTokenRepository refreshTokens,
            SessionRevocationService revocations, AuthProperties config, IdentityAuditService audit) {
        this.jdbc = jdbc;
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.revocations = revocations;
        this.config = config;
        this.audit = audit;
    }

    private static boolean managed(Role role) {
        return role == Role.ADMIN || role == Role.STORE_MANAGER || role == Role.STAFF;
    }

    private int limit(long userId) {
        Integer result = jdbc.queryForObject("SELECT max_active_sessions FROM identity_service.users WHERE id=?",
                Integer.class, userId);
        return result == null ? 3 : result;
    }

    private int activeCount(long userId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM identity_service.auth_sessions "
                + "WHERE user_id=? AND revoked_at IS NULL AND refresh_expires_at > now()", Integer.class, userId);
        return count == null ? 0 : count;
    }

    /** Caller has already locked the user row (login/findByLogin or Google account provisioning). */
    @Transactional
    public void issue(User user, String sid, Instant expiry, String userAgent) {
        if (managed(user.getRole()) && activeCount(user.getId()) >= limit(user.getId())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, Map.of("sessionLimit", "REACHED"));
        }
        String safeAgent = userAgent == null ? null : userAgent.replaceAll("[\\p{Cntrl}]", " ").trim();
        if (safeAgent != null && safeAgent.length() > 240) safeAgent = safeAgent.substring(0, 240);
        jdbc.update("INSERT INTO identity_service.auth_sessions "
                        + "(session_id,user_id,client,role_at_login,store_id_at_login,user_agent,refresh_expires_at) "
                        + "VALUES (?,?,?,?,?,?,?)",
                sid, user.getId(), managed(user.getRole()) ? "admin" : "customer",
                user.getRole().name(), user.getStoreId(), safeAgent, Timestamp.from(expiry));
    }

    /** Called under the same locked user row as refresh rotation. */
    @Transactional
    public void requireActiveAndTouch(long userId, String sid, Instant nextExpiry) {
        int changed = jdbc.update("UPDATE identity_service.auth_sessions SET last_seen_at=now(), refresh_expires_at=? "
                + "WHERE session_id=? AND user_id=? AND revoked_at IS NULL AND refresh_expires_at>now() "
                + "AND EXISTS (SELECT 1 FROM identity_service.users u WHERE u.id=user_id "
                + "AND u.role=role_at_login AND u.store_id IS NOT DISTINCT FROM store_id_at_login)",
                Timestamp.from(nextExpiry), sid, userId);
        if (changed != 1) throw new ApiException(ErrorCode.TOKEN_REVOKED);
    }

    @Transactional(readOnly = true)
    public boolean isActive(long userId, String sid) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM identity_service.auth_sessions s "
                + "JOIN identity_service.users u ON u.id=s.user_id "
                + "WHERE s.session_id=? AND s.user_id=? AND s.revoked_at IS NULL "
                + "AND s.refresh_expires_at>now() AND s.role_at_login=u.role "
                + "AND s.store_id_at_login IS NOT DISTINCT FROM u.store_id",
                Integer.class, sid, userId);
        return count != null && count == 1;
    }

    /** The caller holds the user lock. Redis MUST be written before the DB can commit. */
    @Transactional
    public void revoke(long userId, String sid, long actorId, String reason) {
        List<String> existing = jdbc.queryForList("SELECT session_id FROM identity_service.auth_sessions "
                + "WHERE user_id=? AND session_id=?", String.class, userId, sid);
        if (existing.isEmpty()) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        revocations.revokeSession(sid, config.refreshTtl().plus(config.accessTtl()).plusMinutes(1));
        jdbc.update("UPDATE identity_service.auth_sessions SET revoked_at=COALESCE(revoked_at,now()), "
                + "revoke_reason=COALESCE(revoke_reason,?), revoked_by=COALESCE(revoked_by,?) "
                + "WHERE user_id=? AND session_id=?", reason, actorId, userId, sid);
        refreshTokens.revokeAllForSession(sid);
    }

    /** Caller provides the account lock; user-wide Redis cutoff is handled by RefreshTokenService. */
    @Transactional
    public void revokeAll(long userId, String reason) {
        jdbc.update("UPDATE identity_service.auth_sessions SET revoked_at=now(), revoke_reason=? "
                + "WHERE user_id=? AND revoked_at IS NULL", reason, userId);
    }

    public record Device(String sessionId, String userAgent, Instant createdAt, Instant lastSeenAt,
                         Instant expiresAt, boolean current) {}
    public record Overview(long userId, int activeCount, int limit, List<Device> sessions) {}

    private static Instant instant(ResultSet rs, String name) throws SQLException {
        Timestamp value = rs.getTimestamp(name);
        return value == null ? null : value.toInstant();
    }

    private Overview overview(long userId, String currentSid) {
        List<Device> sessions = jdbc.query("SELECT session_id,user_agent,created_at,last_seen_at,refresh_expires_at "
                        + "FROM identity_service.auth_sessions WHERE user_id=? AND revoked_at IS NULL "
                        + "AND refresh_expires_at>now() ORDER BY last_seen_at DESC LIMIT 10", (rs, index) ->
                        new Device(rs.getString("session_id"), rs.getString("user_agent"),
                                instant(rs, "created_at"), instant(rs, "last_seen_at"),
                                instant(rs, "refresh_expires_at"),
                                Objects.equals(currentSid, rs.getString("session_id"))), userId);
        return new Overview(userId, activeCount(userId), limit(userId), sessions);
    }

    private User authorize(CurrentActor actor, long targetId, boolean lock) {
        if (actor.role() != Role.ADMIN && actor.role() != Role.STORE_MANAGER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        User caller = users.findById(actor.userId()).orElseThrow(() -> new ApiException(ErrorCode.FORBIDDEN));
        if (caller.getRole() != actor.role() || !"ACTIVE".equals(caller.getStatus())
                || !Objects.equals(caller.getStoreId(), actor.storeId())
                || (caller.getRole() == Role.STORE_MANAGER && !caller.isCurrentBranchAccount())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        User target = (lock ? users.findByIdForUpdate(targetId) : users.findById(targetId))
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (targetId == actor.userId()) return target;
        if (caller.getRole() == Role.ADMIN && (target.getRole() == Role.STORE_MANAGER || target.getRole() == Role.STAFF)
                && target.getStoreId() != null) return target;
        if (caller.getRole() == Role.STORE_MANAGER && target.getRole() == Role.STAFF
                && Objects.equals(target.getStoreId(), caller.getStoreId()) && target.isCurrentBranchAccount()) {
            return target;
        }
        throw new ApiException(ErrorCode.FORBIDDEN);
    }

    @Transactional(readOnly = true)
    public Overview list(CurrentActor actor, long targetId, String currentSid) {
        authorize(actor, targetId, false);
        return overview(targetId, currentSid);
    }

    @Transactional
    public Overview setLimit(CurrentActor actor, long targetId, int newLimit, String sid) {
        if (newLimit < 1 || newLimit > 10) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        authorize(actor, targetId, true);
        if (activeCount(targetId) > newLimit) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, Map.of("sessionLimit", "BELOW_ACTIVE_COUNT"));
        }
        jdbc.update("UPDATE identity_service.users SET max_active_sessions=? WHERE id=?", newLimit, targetId);
        audit.record(actor.userId(), actor.role().name(), actor.storeId(), sid, "SESSION_LIMIT_CHANGED",
                targetId, "User", Map.of("limit", newLimit), null);
        return overview(targetId, sid);
    }

    @Transactional
    public void revokeOne(CurrentActor actor, long targetId, String targetSid, String sid) {
        authorize(actor, targetId, true);
        revoke(targetId, targetSid, actor.userId(), "MANUAL");
        audit.record(actor.userId(), actor.role().name(), actor.storeId(), sid, "SESSION_REVOKED",
                targetId, "User", Map.of("revokedSid", targetSid), null);
    }

    @Transactional
    public void revokeOthers(CurrentActor actor, long targetId, String sid) {
        authorize(actor, targetId, true);
        List<String> others = jdbc.queryForList("SELECT session_id FROM identity_service.auth_sessions "
                + "WHERE user_id=? AND session_id<>? AND revoked_at IS NULL AND refresh_expires_at>now()",
                String.class, targetId, sid);
        for (String other : others) revoke(targetId, other, actor.userId(), "MANUAL");
        audit.record(actor.userId(), actor.role().name(), actor.storeId(), sid, "OTHER_SESSIONS_REVOKED",
                targetId, "User", Map.of("count", others.size()), null);
    }

    @Transactional
    public void revokeAllManaged(CurrentActor actor, long targetId, String sid) {
        authorize(actor, targetId, true);
        List<String> active = jdbc.queryForList("SELECT session_id FROM identity_service.auth_sessions "
                + "WHERE user_id=? AND revoked_at IS NULL AND refresh_expires_at>now()", String.class, targetId);
        for (String entry : active) revoke(targetId, entry, actor.userId(), "MANUAL");
        audit.record(actor.userId(), actor.role().name(), actor.storeId(), sid, "ALL_SESSIONS_REVOKED",
                targetId, "User", Map.of("count", active.size()), null);
    }
}
