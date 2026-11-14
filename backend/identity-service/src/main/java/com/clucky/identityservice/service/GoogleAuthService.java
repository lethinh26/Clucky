package com.clucky.identityservice.service;

import com.clucky.identityservice.config.RedisConfig;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleAuthService {
    private static final DefaultRedisScript<Long> RATE_LIMIT = new DefaultRedisScript<>(
            "local count = redis.call('INCR', KEYS[1]); "
                    + "if count == 1 then redis.call('EXPIRE', KEYS[1], 60) end; return count", Long.class);
    private final FirebaseIdentityVerifier verifier;
    private final UserRepository users;
    private final AuthService auth;
    private final PasswordEncoder passwords;
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final Duration pendingTtl;
    private final SecureRandom random = new SecureRandom();

    public GoogleAuthService(FirebaseIdentityVerifier verifier, UserRepository users, AuthService auth,
            PasswordEncoder passwords, StringRedisTemplate redis, ObjectMapper mapper, RedisConfig.Policy policy) {
        this.verifier = verifier;
        this.users = users;
        this.auth = auth;
        this.passwords = passwords;
        this.redis = redis;
        this.mapper = mapper;
        this.pendingTtl = policy.duration("google-pending");
    }

    @Transactional
    public LoginResult login(String idToken) {
        FirebaseIdentityVerifier.Identity identity = verifier.verify(idToken);
        Long attempts;
        try {
            attempts = redis.execute(RATE_LIMIT,
                    List.of(RedisConfig.key("rate-limit", "google:" + digest(identity.uid()))));
        } catch (DataAccessException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (attempts == null) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (attempts > 10) {
            throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
        }
        User user = users.findByFirebaseUid(identity.uid())
                .orElseGet(() -> users.findByEmailForGoogle(identity.email()).orElse(null));
        if (user != null) {
            requireCustomer(user);
            // A verified account-email change must not break an existing
            // Google identity: the Firebase UID, not the email, is stable.
            // Linking by email for the first time still requires exact match.
            if (user.getFirebaseUid() != null
                    ? !identity.uid().equals(user.getFirebaseUid())
                    : !identity.email().equals(user.getEmail())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
            if (user.getFirebaseUid() == null) {
                user.setFirebaseUid(identity.uid());
                users.saveAndFlush(user);
            }
            return new LoginResult(auth.issueSession(user), null);
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String pendingToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        try {
            redis.opsForValue().set(pendingKey(pendingToken), mapper.writeValueAsString(identity), pendingTtl);
        } catch (JsonProcessingException failure) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        } catch (DataAccessException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        return new LoginResult(null, pendingToken);
    }

    @Transactional
    public AuthService.AuthResult complete(String pendingToken, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        String payload;
        // ponytail: consume once; restart Google after DB failure. Add durable claims if same-token retries are required.
        try {
            payload = redis.opsForValue().getAndDelete(pendingKey(pendingToken));
        } catch (DataAccessException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (payload == null) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }
        FirebaseIdentityVerifier.Identity identity;
        try {
            identity = mapper.readValue(payload, FirebaseIdentityVerifier.Identity.class);
        } catch (JsonProcessingException failure) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
        if (users.findByFirebaseUid(identity.uid()).isPresent()
                || users.findByEmailForGoogle(identity.email()).isPresent()) {
            throw new ApiException(ErrorCode.EMAIL_EXISTS);
        }
        User user = new User();
        user.setEmail(identity.email());
        user.setFirebaseUid(identity.uid());
        user.setFullName(identity.fullName());
        user.setPasswordHash(passwords.encode(password));
        user.setRole(Role.CUSTOMER);
        user.setStoreId(null);
        user.setStatus(AuthService.STATUS_ACTIVE);
        user.setEmailVerified(true);
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException failure) {
            throw new ApiException(ErrorCode.EMAIL_EXISTS);
        }
        return auth.issueSession(user);
    }

    private void requireCustomer(User user) {
        if (!AuthService.STATUS_ACTIVE.equals(user.getStatus())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }
        if (user.getRole() != Role.CUSTOMER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
    }

    private String pendingKey(String token) {
        return RedisConfig.key("auth:google:pending", digest(token));
    }

    private String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException failure) {
            throw new IllegalStateException("SHA-256 unavailable");
        }
    }

    public record LoginResult(AuthService.AuthResult session, String pendingToken) {}
}
