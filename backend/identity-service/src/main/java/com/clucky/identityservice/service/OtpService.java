package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.JwtSettings;
import com.clucky.identityservice.entity.OtpCode;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.OtpCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

/**
 * OTP lifecycle service.
 *
 * <p>Security notes:
 * <ul>
 *   <li>A 6-digit code has a small search space, so the stored verifier is an HMAC-SHA-256 keyed with
 *       the protected server secret instead of a plain digest. A leaked database alone is therefore not
 *       enough to recover a code.</li>
 *   <li>Issuing a new challenge invalidates every previous unused challenge for the same
 *       identifier + purpose (BLOCKER 11). Purpose isolation is enforced by the repository query.</li>
 *   <li>Consumption uses a conditional UPDATE so two concurrent verifications cannot both succeed.</li>
 * </ul>
 */
@Service
public class OtpService {
    public static final String PURPOSE_REGISTER = "REGISTER";
    public static final String PURPOSE_RESET = "RESET";

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final DefaultRedisScript<Long> ATTEMPT_COUNTER = new DefaultRedisScript<>(
            "local count = redis.call('INCR', KEYS[1]); "
                    + "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return count", Long.class);

    private final OtpCodeRepository otpCodeRepository;
    private final AuthProperties authProperties;
    private final StringRedisTemplate redis;
    private final byte[] verifierKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(OtpCodeRepository otpCodeRepository, AuthProperties authProperties, JwtSettings jwtSettings,
            StringRedisTemplate redis) {
        this.otpCodeRepository = otpCodeRepository;
        this.authProperties = authProperties;
        this.redis = redis;
        this.verifierKey = jwtSettings.secret() == null ? new byte[0]
                : jwtSettings.secret().getBytes(StandardCharsets.UTF_8);
        if (this.verifierKey.length < 32) {
            throw new IllegalStateException("OTP verifier requires the configured JWT secret of at least 32 bytes");
        }
    }

    @Transactional
    public String generateAndSaveOtp(String identifier, String purpose) {
        if (identifier == null || identifier.isBlank() || purpose == null || purpose.isBlank()) {
            throw new IllegalArgumentException("Identifier and purpose are required");
        }
        if (!PURPOSE_REGISTER.equals(purpose) && !PURPOSE_RESET.equals(purpose)) {
            throw new IllegalArgumentException("Unsupported OTP purpose");
        }

        // Invalidate every previous unused challenge for the same identifier + purpose.
        otpCodeRepository.invalidatePrevious(identifier, purpose);

        String rawCode = String.format("%06d", secureRandom.nextInt(1_000_000));

        OtpCode entity = new OtpCode();
        entity.setIdentifier(identifier);
        entity.setCodeHash(verifier(rawCode));
        entity.setPurpose(purpose);
        Instant createdAt = Instant.now();
        entity.setExpiresAt(createdAt.plus(authProperties.otpTtl()));
        entity.setUsed(false);
        entity.setCreatedAt(createdAt);

        otpCodeRepository.save(entity);

        return rawCode;
    }

    @Transactional
    public void verifyAndConsume(String identifier, String purpose, String rawCode) {
        if (identifier == null || identifier.isBlank() || purpose == null || purpose.isBlank()
                || rawCode == null || rawCode.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }

        limitAttempts("verify", identifier, purpose);

        OtpCode otp = otpCodeRepository
                .findFirstByIdentifierAndPurposeAndUsedFalseOrderByCreatedAtDesc(identifier, purpose)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_OTP));

        if (Boolean.TRUE.equals(otp.getUsed()) || !purpose.equals(otp.getPurpose())) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }

        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(ErrorCode.OTP_EXPIRED);
        }

        String candidate = verifier(rawCode.trim());
        if (!MessageDigest.isEqual(candidate.getBytes(StandardCharsets.UTF_8),
                otp.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }

        // Conditional update: only one concurrent caller can flip used=false -> true.
        if (otpCodeRepository.consumeOtp(otp.getId()) == 0) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }
    }

    public void limitIssuance(String identifier, String purpose) {
        limitAttempts("issue", identifier, purpose);
    }

    public void limitVerification(String identifier, String purpose) {
        limitAttempts("verify", identifier, purpose);
    }

    private void limitAttempts(String action, String identifier, String purpose) {
        Long count;
        try {
            String key = "rate-limit:otp:" + action + ":" + purpose + ":" + verifier(identifier);
            count = redis.execute(ATTEMPT_COUNTER, List.of(key), String.valueOf(authProperties.otpTtl().toMillis()));
        } catch (RuntimeException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (count == null) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (count > 5) {
            throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
        }
    }

    /** Keyed verifier so the stored value cannot be brute-forced from the database alone. */
    public String verifier(String rawCode) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(verifierKey, HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(rawCode.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception failure) {
            throw new IllegalStateException("OTP verifier is unavailable", failure);
        }
    }
}
