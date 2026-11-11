package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.dto.BranchAccountData.*;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Service
public class BranchAccountService {
    private final JdbcTemplate jdbc;
    private final OtpService otp;
    private final AuthProperties auth;
    private final PasswordEncoder passwords;
    private final RefreshTokenService sessions;
    private final IdentityAuditService audit;

    public BranchAccountService(JdbcTemplate jdbc, OtpService otp, AuthProperties auth,
            PasswordEncoder passwords, RefreshTokenService sessions, IdentityAuditService audit) {
        this.jdbc = jdbc; this.otp = otp; this.auth = auth; this.passwords = passwords;
        this.sessions = sessions;
        this.audit = audit;
    }

    private void lock() { jdbc.execute("SELECT pg_advisory_xact_lock(192615)"); }
    private ApiException failure(ErrorCode code) { return new ApiException(code); }
    private String normalized(String value) { return value.trim().toLowerCase(Locale.ROOT); }
    private long number(Map<String, Object> row, String field) { return ((Number) row.get(field)).longValue(); }
    private Map<String, Object> user(long id) {
        var rows = jdbc.queryForList("SELECT * FROM identity_service.users WHERE id=? FOR UPDATE", id);
        if (rows.isEmpty()) throw failure(ErrorCode.RESOURCE_NOT_FOUND);
        return rows.getFirst();
    }
    private Map<String, Object> branch(long storeId) {
        var rows = jdbc.queryForList("SELECT * FROM identity_service.branch_accounts WHERE store_id=? FOR UPDATE", storeId);
        if (rows.isEmpty()) throw failure(ErrorCode.RESOURCE_NOT_FOUND);
        return rows.getFirst();
    }
    private void scope(long storeId) {
        var actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && (actor.role() != Role.STORE_MANAGER || !Objects.equals(actor.storeId(), storeId)))
            throw failure(ErrorCode.FORBIDDEN);
    }
    private void admin() {
        if (CurrentActor.require().role() != Role.ADMIN) throw failure(ErrorCode.FORBIDDEN);
    }
    private void reauthenticate(String password) {
        var actor = CurrentActor.require();
        otp.limitVerification("branch-reauth:" + actor.userId(), "BRANCH");
        var account = user(actor.userId());
        if (!"ACTIVE".equals(account.get("status")) || account.get("password_hash") == null
                || !passwords.matches(password, account.get("password_hash").toString())) throw failure(ErrorCode.INVALID_CREDENTIALS);
    }
    public static String sessionId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication instanceof JwtAuthenticationToken token ? token.getToken().getClaimAsString("sid") : null;
    }
    private List<Account> accounts(long storeId, boolean currentOnly) {
        return jdbc.query("SELECT id, store_id, role, login_name, email, status, email_verified, current_branch_account "
                + "FROM identity_service.users WHERE store_id=? AND role IN ('STAFF','STORE_MANAGER') "
                + (currentOnly ? "AND current_branch_account " : "") + "ORDER BY id", (row, index) ->
                new Account(row.getLong("id"), row.getLong("store_id"), row.getString("role"),
                        row.getString("login_name") == null ? row.getString("email") : row.getString("login_name"),
                        row.getString("status"), row.getBoolean("email_verified"), row.getBoolean("current_branch_account")), storeId);
    }
    private Pair pair(long storeId) {
        var settings = branch(storeId);
        var accounts = accounts(storeId, true);
        if (accounts.size() != 2 || accounts.stream().map(Account::role).distinct().count() != 2)
            throw failure(ErrorCode.RESOURCE_CONFLICT);
        boolean ready = accounts.stream().allMatch(account -> account.activated() && account.status().equals("ACTIVE"));
        return new Pair(storeId, ready ? "READY" : "PROVISIONED", (String) settings.get("recovery_email"),
                Boolean.TRUE.equals(settings.get("email_verified")), number(settings, "version"), accounts);
    }

    @Transactional
    public Pair get(long storeId) { scope(storeId); return pair(storeId); }

    @Transactional
    public Pair internalGet(long storeId) { return pair(storeId); }

    @Transactional
    public Pair provision(long storeId, Provision request) {
        lock();
        if (storeId <= 0) throw failure(ErrorCode.VALIDATION_ERROR);
        var actor = user(request.actorId());
        if (!"ADMIN".equals(actor.get("role")) || !"ACTIVE".equals(actor.get("status"))) throw failure(ErrorCode.FORBIDDEN);
        String hash = otp.verifier(storeId + ":" + normalized(request.recoveryEmail()) + ":" + request.actorId());
        var existing = jdbc.queryForList("SELECT request_key, request_hash FROM identity_service.branch_accounts WHERE store_id=?", storeId);
        if (!existing.isEmpty()) {
            if (!existing.getFirst().get("request_key").equals(request.requestKey()) || !existing.getFirst().get("request_hash").equals(hash))
                throw failure(ErrorCode.RESOURCE_CONFLICT);
            return pair(storeId);
        }
        if (!accounts(storeId, false).isEmpty()) throw failure(ErrorCode.RESOURCE_CONFLICT);
        jdbc.update("INSERT INTO identity_service.branch_accounts(store_id,request_key,request_hash,recovery_email) VALUES (?,?,?,?)",
                storeId, request.requestKey(), hash, normalized(request.recoveryEmail()));
        for (String role : List.of("STORE_MANAGER", "STAFF")) {
            String login = (role.equals("STAFF") ? "staff." : "manager.") + storeId;
            long id = jdbc.queryForObject("INSERT INTO identity_service.users(login_name,full_name,role,store_id,email_verified,current_branch_account) "
                    + "VALUES (?,?,?,?,FALSE,TRUE) RETURNING id", Long.class, login, login, role, storeId);
            createChallenge(id, storeId, "ACTIVATE", null, null, normalized(request.recoveryEmail()), null, 0L);
        }
        audit(request.actorId(), "ADMIN", storeId, request.sessionId(), "BRANCH_PROVISIONED", storeId, "Store", "SUCCESS", request.correlationId());
        return pair(storeId);
    }

    @Transactional
    public Challenge request(RequestChallenge request) {
        lock();
        String login = normalized(request.login());
        otp.limitIssuance("branch:" + login, "BRANCH");
        var matches = jdbc.queryForList("SELECT * FROM identity_service.users WHERE login_name=? OR (login_name IS NULL AND email=?) FOR UPDATE", login, login);
        UUID opaque = UUID.randomUUID();
        if (matches.isEmpty()) return new Challenge(opaque);
        var target = matches.getFirst();
        if (!Set.of("ADMIN", "STORE_MANAGER", "STAFF").contains(target.get("role")) || !"ACTIVE".equals(target.get("status"))) return new Challenge(opaque);
        boolean current = Boolean.TRUE.equals(target.get("current_branch_account"));
        boolean activated = Boolean.TRUE.equals(target.get("email_verified"));
        if (request.purpose().equals("ACTIVATE") ? (!current || activated) : !activated) return new Challenge(opaque);
        Long storeId = current ? number(target, "store_id") : null;
        var settings = current ? branch(storeId) : null;
        String recipient = current ? (String) settings.get("recovery_email") : (String) target.get("email");
        if (recipient == null || recipient.isBlank()) return new Challenge(opaque);
        return createChallenge(number(target, "id"), storeId, request.purpose(), null, null, recipient, null,
                current ? number(settings, "version") : null);
    }

    private Challenge createChallenge(long targetId, Long storeId, String purpose, Long actorId, String sid,
            String recipient, String newEmail, Long version) {
        jdbc.update("UPDATE identity_service.branch_challenges SET used=TRUE WHERE target_id=? AND purpose=? AND NOT used", targetId, purpose);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO identity_service.branch_challenges(id,target_id,store_id,purpose,actor_id,session_id,branch_version,recipient,new_email,expires_at) "
                + "VALUES (?,?,?,?,?,?,?,?,?,?)", id, targetId, storeId, purpose, actorId, sid, version, recipient, newEmail,
                Timestamp.from(Instant.now().plus(auth.otpTtl())));
        return new Challenge(id);
    }

    @Transactional
    public Challenge manage(long targetId, Management request) {
        lock();
        var actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.role() != Role.STORE_MANAGER) throw failure(ErrorCode.FORBIDDEN);
        reauthenticate(request.currentPassword());
        var target = user(targetId);
        if (!Boolean.TRUE.equals(target.get("current_branch_account"))) throw failure(ErrorCode.FORBIDDEN);
        long storeId = number(target, "store_id");
        scope(storeId);
        var settings = branch(storeId);
        boolean emailChange = request.purpose().equals("RECOVERY");
        if (!emailChange && !Boolean.TRUE.equals(target.get("email_verified"))) throw failure(ErrorCode.RESOURCE_CONFLICT);
        if (!emailChange && actor.role() != Role.ADMIN) throw failure(ErrorCode.FORBIDDEN);
        if (emailChange && (request.newEmail() == null || request.newEmail().isBlank())) throw failure(ErrorCode.VALIDATION_ERROR);
        if (!emailChange && request.newEmail() != null) throw failure(ErrorCode.VALIDATION_ERROR);
        if (actor.role() == Role.STORE_MANAGER && (!Boolean.TRUE.equals(user(actor.userId()).get("current_branch_account"))
                || !Boolean.TRUE.equals(settings.get("email_verified")))) throw failure(ErrorCode.FORBIDDEN);
        var actorRow = user(actor.userId());
        String recipient = actor.role() == Role.ADMIN ? (String) actorRow.get("email") : (String) settings.get("recovery_email");
        if (recipient == null || !Boolean.TRUE.equals(actorRow.get("email_verified"))) throw failure(ErrorCode.FORBIDDEN);
        otp.limitIssuance("branch-management:" + actor.userId(), "BRANCH");
        String purpose = actor.role() == Role.ADMIN ? "ADMIN_" + request.purpose() : "RECOVERY";
        return createChallenge(targetId, storeId, purpose, actor.userId(), sessionId(), recipient,
                emailChange ? normalized(request.newEmail()) : null, number(settings, "version"));
    }

    public String code(UUID challengeId, String channel) {
        String digest = otp.verifier("branch-code-v1:" + challengeId + ":" + channel);
        return String.format(Locale.ROOT, "%08d", Long.parseUnsignedLong(digest.substring(0, 12), 16) % 100_000_000);
    }
    private boolean sameCode(String expected, String received) {
        return received != null && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), received.getBytes(StandardCharsets.UTF_8));
    }

    @Transactional
    public void finish(Finish request, boolean management) {
        lock();
        var rows = jdbc.queryForList("SELECT * FROM identity_service.branch_challenges WHERE id=? FOR UPDATE", request.challengeId());
        if (rows.isEmpty()) throw failure(ErrorCode.INVALID_OTP);
        var challenge = rows.getFirst();
        long targetId = number(challenge, "target_id");
        otp.limitVerification("branch-account:" + targetId, "BRANCH");
        String purpose = challenge.get("purpose").toString();
        if (management != (challenge.get("actor_id") != null)) throw failure(ErrorCode.FORBIDDEN);
        if (management && (!Objects.equals(number(challenge, "actor_id"), CurrentActor.require().userId())
                || !Objects.equals(challenge.get("session_id"), sessionId()))) throw failure(ErrorCode.FORBIDDEN);
        if (Boolean.TRUE.equals(challenge.get("used"))) throw failure(ErrorCode.INVALID_OTP);
        if (((Timestamp) challenge.get("expires_at")).toInstant().isBefore(Instant.now())) throw failure(ErrorCode.OTP_EXPIRED);
        var target = user(targetId);
        if (!management && !"ACTIVE".equals(target.get("status"))) throw failure(ErrorCode.INVALID_OTP);
        Long storeId = (Long) challenge.get("store_id");
        if (management) {
            if (storeId == null || !Boolean.TRUE.equals(target.get("current_branch_account"))) throw failure(ErrorCode.FORBIDDEN);
            scope(storeId);
            var actor = user(CurrentActor.require().userId());
            if (!"ACTIVE".equals(actor.get("status")) || !actor.get("role").equals(CurrentActor.require().role().name()))
                throw failure(ErrorCode.FORBIDDEN);
            if (purpose.startsWith("ADMIN_") && CurrentActor.require().role() != Role.ADMIN) throw failure(ErrorCode.FORBIDDEN);
            if (CurrentActor.require().role() == Role.STORE_MANAGER
                    && (!Boolean.TRUE.equals(actor.get("current_branch_account")) || !Objects.equals(actor.get("store_id"), storeId)))
                throw failure(ErrorCode.FORBIDDEN);
        }
        if (storeId != null && number(branch(storeId), "version") != number(challenge, "branch_version")) throw failure(ErrorCode.RESOURCE_CONFLICT);
        if (!sameCode(code(request.challengeId(), "primary"), request.otp())
                || challenge.get("new_email") != null && !sameCode(code(request.challengeId(), "secondary"), request.newEmailOtp()))
            throw failure(ErrorCode.INVALID_OTP);
        if (purpose.endsWith("RECOVERY")) {
            jdbc.update("UPDATE identity_service.branch_accounts SET recovery_email=?,email_verified=TRUE,version=version+1 WHERE store_id=?",
                    challenge.get("new_email"), storeId);
            jdbc.update("UPDATE identity_service.branch_challenges SET used=TRUE WHERE store_id=?", storeId);
            for (Account account : accounts(storeId, true)) { user(account.id()); sessions.revokeAllForUser(account.id()); }
        } else {
            if (purpose.equals("ADMIN_RESET") && !Boolean.TRUE.equals(target.get("email_verified"))) throw failure(ErrorCode.RESOURCE_CONFLICT);
            if (request.password() == null || !request.password().matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$")
                    || request.password().getBytes(StandardCharsets.UTF_8).length > 72) throw failure(ErrorCode.VALIDATION_ERROR);
            jdbc.update("UPDATE identity_service.users SET password_hash=?,email_verified=TRUE,updated_at=now() WHERE id=?", passwords.encode(request.password()), targetId);
            if (storeId != null && !purpose.equals("ADMIN_RESET")) jdbc.update("UPDATE identity_service.branch_accounts SET email_verified=TRUE WHERE store_id=?", storeId);
            sessions.revokeAllForUser(targetId);
            jdbc.update("UPDATE identity_service.branch_challenges SET used=TRUE WHERE target_id=?", targetId);
        }
        var actor = management ? CurrentActor.require() : new CurrentActor(targetId, Role.valueOf(target.get("role").toString()), storeId);
        audit(actor.userId(), actor.role().name(), storeId, management ? sessionId() : null, "ACCOUNT_" + purpose, targetId, "Account", "SUCCESS", null);
    }


    @Transactional
    public void lockAccount(long targetId, boolean locked) {
        lock(); admin(); var target = user(targetId);
        if (!Boolean.TRUE.equals(target.get("current_branch_account"))) throw failure(ErrorCode.FORBIDDEN);
        jdbc.update("UPDATE identity_service.users SET status=?,updated_at=now() WHERE id=?", locked ? "LOCKED" : "ACTIVE", targetId);
        sessions.revokeAllForUser(targetId);
        audit(CurrentActor.require().userId(), "ADMIN", number(target, "store_id"), sessionId(), locked ? "ACCOUNT_LOCKED" : "ACCOUNT_UNLOCKED", targetId, "Account", "SUCCESS", null);
    }

    private void audit(long actorId, String role, Long storeId, String sid, String action, long targetId, String targetType, String result, String correlation) {
        audit.record(actorId, role, storeId, sid, action, targetId, targetType,
                Map.of("result", result, "identity", "SHARED_ACCOUNT_NOT_PERSON"), correlation);
    }
}
