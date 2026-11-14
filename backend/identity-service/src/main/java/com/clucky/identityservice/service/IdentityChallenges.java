package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Phone challenge metadata only; provider keeps the actual SMS verifier. */
@Service
public class IdentityChallenges {
    private static final String SMS = "identity_service.sms_otp_challenges";
    private static final String EMAIL = "identity_service.email_bind_challenges";
    private final JdbcTemplate jdbc;
    private final BridgeOtpClient bridge;
    private final OtpService otp;
    private final EmailEventPublisher publisher;
    private final UserRepository users;
    private final AuthProperties authProperties;

    public IdentityChallenges(JdbcTemplate jdbc, BridgeOtpClient bridge, OtpService otp,
            EmailEventPublisher publisher, UserRepository users, AuthProperties authProperties) {
        this.jdbc = jdbc;
        this.bridge = bridge;
        this.otp = otp;
        this.publisher = publisher;
        this.users = users;
        this.authProperties = authProperties;
    }

    @Transactional
    public String sendSms(User user, String purpose) {
        customer(user);
        if (user.getPhone() == null || user.getPhone().isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        // REGISTER phone proofs must never become a passwordless takeover path
        // for old email accounts with an unverified, user-entered phone.
        if ("REGISTER".equals(purpose)
                && (user.getEmail() != null || Boolean.TRUE.equals(user.getEmailVerified())
                    || Boolean.TRUE.equals(user.getPhoneVerified()))) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        if (!"REGISTER".equals(purpose) && !Boolean.TRUE.equals(user.getPhoneVerified())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        otp.limitIssuance(user.getPhone(), purpose);
        BridgeOtpClient.Challenge sent = bridge.send(PhoneNumbers.normalize(user.getPhone()));
        jdbc.update("UPDATE " + SMS + " SET used=true WHERE user_id=? AND purpose=? AND NOT used",
                user.getId(), purpose);
        UUID challengeId = UUID.randomUUID();
        jdbc.update("INSERT INTO " + SMS
                + "(id,user_id,phone,purpose,bridge_id,expires_at) VALUES (?,?,?,?,?,?)",
                challengeId, user.getId(), user.getPhone(), purpose, sent.id(),
                Timestamp.from(capExpiry(sent.expiresAt())));
        return challengeId.toString();
    }

    @Transactional
    public void verifySms(User user, String purpose, String challengeId, String code) {
        customer(user);
        if (code == null || !code.matches("[0-9]{4,10}")) throw new ApiException(ErrorCode.INVALID_OTP);
        otp.limitVerification(user.getPhone(), purpose);
        UUID id = parseId(challengeId);
        var found = jdbc.queryForList("SELECT user_id,phone,purpose,bridge_id,expires_at,used FROM "
                + SMS + " WHERE id=? FOR UPDATE", id);
        if (found.isEmpty()) throw new ApiException(ErrorCode.INVALID_OTP);
        Map<String, Object> challenge = found.getFirst();
        if (!user.getId().equals(((Number) challenge.get("user_id")).longValue())
                || !purpose.equals(challenge.get("purpose"))
                || !user.getPhone().equals(challenge.get("phone"))
                || Boolean.TRUE.equals(challenge.get("used"))) throw new ApiException(ErrorCode.INVALID_OTP);
        if (!expiresAt(challenge.get("expires_at")).isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.OTP_EXPIRED);
        }
        bridge.verify(challenge.get("bridge_id").toString(), code);
        if (jdbc.update("UPDATE " + SMS + " SET used=true WHERE id=? AND NOT used", id) != 1) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }
    }

    /**
     * Send a Bridge code to a prospective number, not the number currently on
     * the profile. This also supports Google accounts with no phone yet.
     */
    @Transactional
    public String sendPhoneBinding(User user, String requestedPhone) {
        customer(user);
        String target = PhoneNumbers.normalize(requestedPhone);
        if (PhoneNumbers.equivalent(user.getPhone(), target)
                && Boolean.TRUE.equals(user.getPhoneVerified())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT,
                    Map.of("phone", "ALREADY_VERIFIED"));
        }
        ensurePhoneAvailable(user, target);
        otp.limitIssuance("account:" + user.getId(), "PHONE_BIND");
        otp.limitIssuance(target, "PHONE_BIND");

        BridgeOtpClient.Challenge sent = bridge.send(target);
        // Called under an authenticated-user row lock by ProfileController.
        // Only the latest target challenge may be used.
        jdbc.update("UPDATE " + SMS + " SET used=true "
                + "WHERE user_id=? AND purpose='PHONE_BIND' AND NOT used", user.getId());
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO " + SMS
                        + " (id,user_id,phone,purpose,bridge_id,expires_at) "
                        + "VALUES (?,?,?,'PHONE_BIND',?,?)",
                id, user.getId(), target, sent.id(), Timestamp.from(capExpiry(sent.expiresAt())));
        return id.toString();
    }

    /**
     * Finish phone binding atomically. The provider verifies the code; Clucky
     * stores only challenge metadata and commits the new verified phone.
     */
    @Transactional
    public void confirmPhoneBinding(User user, String requestedPhone, String challengeId, String code) {
        customer(user);
        String target = PhoneNumbers.normalize(requestedPhone);
        if (code == null || !code.matches("[0-9]{4,10}")) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }
        otp.limitVerification("account:" + user.getId(), "PHONE_BIND");
        otp.limitVerification(target, "PHONE_BIND");
        UUID id = parseId(challengeId);
        var found = jdbc.queryForList("SELECT user_id,phone,purpose,bridge_id,expires_at,used "
                + "FROM " + SMS + " WHERE id=? FOR UPDATE", id);
        if (found.isEmpty()) throw new ApiException(ErrorCode.INVALID_OTP);
        Map<String,Object> challenge = found.getFirst();
        if (!Objects.equals(user.getId(), ((Number) challenge.get("user_id")).longValue())
                || !"PHONE_BIND".equals(challenge.get("purpose"))
                || !target.equals(challenge.get("phone"))) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }
        if (Boolean.TRUE.equals(challenge.get("used"))) {
            // A replay of a completed HTTP confirmation must not change state.
            if (Boolean.TRUE.equals(user.getPhoneVerified())
                    && PhoneNumbers.equivalent(user.getPhone(), target)) return;
            throw new ApiException(ErrorCode.INVALID_OTP);
        }
        if (!expiresAt(challenge.get("expires_at")).isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.OTP_EXPIRED);
        }
        ensurePhoneAvailable(user, target);
        bridge.verify(challenge.get("bridge_id").toString(), code);
        try {
            user.setPhone(target);
            user.setPhoneVerified(true);
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException conflict) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, Map.of("phone", "ALREADY_EXISTS"));
        }
        if (jdbc.update("UPDATE " + SMS + " SET used=true WHERE id=? AND NOT used", id) != 1) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }
        // Password recovery/change challenges for a former number cannot
        // remain valid after the trusted phone contact changes.
        jdbc.update("UPDATE " + SMS + " SET used=true WHERE user_id=? "
                + "AND purpose IN ('PASSWORD_RESET','PASSWORD_CHANGE') AND NOT used",
                user.getId());
    }

    private void ensurePhoneAvailable(User user, String target) {
        var representations = new java.util.HashSet<String>();
        representations.add(target);
        representations.add(PhoneNumbers.legacyVietnamese(target));
        for (String candidate : representations) {
            users.findByPhone(candidate).ifPresent(existing -> {
                if (!Objects.equals(existing.getId(), user.getId())) {
                    throw new ApiException(ErrorCode.RESOURCE_CONFLICT,
                            Map.of("phone", "ALREADY_EXISTS"));
                }
            });
        }
    }

    @Transactional
    public String sendEmailBinding(User user, String recipient) {
        customer(user);
        String email = normalizedEmail(recipient);
        if (email.equals(user.getEmail()) && Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT,
                    Map.of("email", "ALREADY_VERIFIED"));
        }
        if (users.existsByEmail(email) && !email.equals(user.getEmail())) {
            throw new ApiException(ErrorCode.EMAIL_EXISTS);
        }
        otp.limitIssuance("account:" + user.getId(), OtpService.PURPOSE_EMAIL_BIND);
        otp.limitIssuance(email, OtpService.PURPOSE_EMAIL_BIND);
        jdbc.update("UPDATE " + EMAIL + " SET used=true WHERE user_id=? AND NOT used", user.getId());
        UUID id = UUID.randomUUID();
        String verifierId = emailIdentifier(id);
        String code = otp.generateAndSaveOtp(verifierId, OtpService.PURPOSE_EMAIL_BIND);
        jdbc.update("INSERT INTO " + EMAIL + "(id,user_id,email,expires_at) VALUES (?,?,?,?)",
                id, user.getId(), email, Timestamp.from(Instant.now().plus(authProperties.otpTtl())));
        publisher.publishOtpEmail(email, EmailEventPublisher.TEMPLATE_REGISTER_OTP, code,
                Map.of("fullName", user.getFullName()));
        return id.toString();
    }

    @Transactional
    public void confirmEmailBinding(User user, String recipient, String challengeId, String code) {
        customer(user);
        UUID id = parseId(challengeId);
        String email = normalizedEmail(recipient);
        var found = jdbc.queryForList("SELECT user_id,email,expires_at,used FROM "
                + EMAIL + " WHERE id=? FOR UPDATE", id);
        if (found.isEmpty()) throw new ApiException(ErrorCode.INVALID_OTP);
        Map<String, Object> challenge = found.getFirst();
        if (!user.getId().equals(((Number) challenge.get("user_id")).longValue())
                || !email.equals(challenge.get("email"))
                || Boolean.TRUE.equals(challenge.get("used"))) throw new ApiException(ErrorCode.INVALID_OTP);
        if (!expiresAt(challenge.get("expires_at")).isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.OTP_EXPIRED);
        }
        otp.verifyAndConsume(emailIdentifier(id), OtpService.PURPOSE_EMAIL_BIND, code);
        if (users.existsByEmail(email) && !email.equals(user.getEmail())) throw new ApiException(ErrorCode.EMAIL_EXISTS);
        user.setEmail(email);
        user.setEmailVerified(true);
        users.saveAndFlush(user);
        jdbc.update("UPDATE " + EMAIL + " SET used=true WHERE id=?", id);
    }

    private static String emailIdentifier(UUID id) { return "email-bind:" + id; }

    private Instant capExpiry(Instant bridgeExpiry) {
        Instant localLimit = Instant.now().plus(authProperties.otpTtl());
        return bridgeExpiry.isBefore(localLimit) ? bridgeExpiry : localLimit;
    }

    private static Instant expiresAt(Object value) {
        if (value instanceof Timestamp timestamp) return timestamp.toInstant();
        if (value instanceof java.time.OffsetDateTime dateTime) return dateTime.toInstant();
        if (value instanceof java.time.Instant instant) return instant;
        throw new ApiException(ErrorCode.UPSTREAM_ERROR);
    }
    private static UUID parseId(String raw) {
        try { return UUID.fromString(raw); }
        catch (RuntimeException failure) { throw new ApiException(ErrorCode.INVALID_OTP); }
    }

    public static String normalizedEmail(String raw) {
        String email = AuthService.normalizeEmail(raw);
        if (email == null || email.isBlank() || email.length() > 255
                || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        return email;
    }

    private static void customer(User user) {
        if (user == null || user.getRole() != Role.CUSTOMER || user.isCurrentBranchAccount()
                || !"ACTIVE".equals(user.getStatus())) throw new ApiException(ErrorCode.FORBIDDEN);
    }
}
