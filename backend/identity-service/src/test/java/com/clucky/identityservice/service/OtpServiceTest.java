package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.JwtSettings;
import com.clucky.identityservice.entity.OtpCode;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.OtpCodeRepository;
import java.lang.reflect.Proxy;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

class OtpServiceTest {
    private static final String SECRET = "unit-test-secret-value-at-least-32-bytes-long";

    private InMemoryOtpRepository repository;
    private OtpService service;
    private StringRedisTemplate redis;

    @BeforeEach
    void setUp() {
        repository = new InMemoryOtpRepository();
        redis = mock(StringRedisTemplate.class);
        when(redis.execute(any(RedisScript.class), anyList(), anyString())).thenReturn(1L);
        AuthProperties properties = new AuthProperties(Duration.ofMinutes(30), Duration.ofDays(7),
                Duration.ofMinutes(5), new AuthProperties.Cookie(false), List.of());
        service = new OtpService(repository.proxy(), properties,
                new JwtSettings(SECRET, "clucky-identity", "clucky-api"), redis);
    }

    @Test
    void generatedCodeIsSixDigitsAndStoredOnlyAsVerifier() {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);

        assertTrue(code.matches("[0-9]{6}"), "OTP must be 6 digits");
        OtpCode stored = repository.rows.get(0);
        assertNotEquals(code, stored.getCodeHash(), "Plaintext OTP must never be stored");
        assertEquals(service.verifier(code), stored.getCodeHash());
        assertEquals(Duration.ofMinutes(5),
                Duration.between(stored.getCreatedAt(), stored.getExpiresAt()));
    }

    @Test
    void newChallengeInvalidatesPreviousUnusedChallenge() {
        String first = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);
        String second = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);

        assertTrue(repository.rows.get(0).getUsed(), "Previous OTP must be invalidated");
        assertFalse(repository.rows.get(1).getUsed());
        ApiException failure = assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, first));
        assertEquals(ErrorCode.INVALID_OTP, failure.getCode());
        assertDoesNotThrow(() -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, second));
    }

    @Test
    void newRegisterChallengeDoesNotInvalidateResetChallenge() {
        service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_RESET);
        service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);

        assertFalse(repository.rows.get(0).getUsed(), "RESET OTP must survive a REGISTER challenge");
    }

    @Test
    void registerOtpCannotAuthorizeReset() {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);
        ApiException failure = assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_RESET, code));
        assertEquals(ErrorCode.INVALID_OTP, failure.getCode());
        assertFalse(repository.rows.get(0).getUsed(), "Wrong-purpose attempt must not consume the code");
    }

    @Test
    void resetOtpCannotVerifyRegistration() {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_RESET);
        assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, code));
    }

    @Test
    void expiredOtpIsRejected() {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);
        repository.rows.get(0).setExpiresAt(Instant.now().minusSeconds(1));

        ApiException failure = assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, code));
        assertEquals(ErrorCode.OTP_EXPIRED, failure.getCode());
    }

    @Test
    void usedOtpCannotBeConsumedTwice() {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);
        service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, code);

        assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, code));
    }

    @Test
    void concurrentVerificationConsumesChallengeOnlyOnce() throws Exception {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);
        repository.atomicConsume = true;

        int successes = repository.raceTwoVerifications(() ->
                service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, code));

        assertEquals(1, successes, "Exactly one concurrent verification may succeed");
    }

    @Test
    void wrongCodeIsRejected() {
        service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_REGISTER);
        String wrong = "000000";
        ApiException failure = assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_REGISTER, wrong));
        assertEquals(ErrorCode.INVALID_OTP, failure.getCode());
    }

    @Test
    void unsupportedPurposeIsRejectedAtIssuance() {
        assertThrows(IllegalArgumentException.class, () -> service.generateAndSaveOtp("a@b.com", "LOGIN"));
    }

    @Test
    void failedAttemptsAreLimitedEvenAfterNewChallenge() {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_RESET);
        String wrong = code.equals("000000") ? "000001" : "000000";
        var attempts = new java.util.concurrent.atomic.AtomicLong();
        when(redis.execute(any(RedisScript.class), argThat((List<String> keys) ->
                keys != null && keys.getFirst().contains(":verify:")), anyString()))
                .thenAnswer(invocation -> attempts.incrementAndGet());
        for (int attempt = 0; attempt < 5; attempt++) {
            assertEquals(ErrorCode.INVALID_OTP, assertThrows(ApiException.class,
                    () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_RESET, wrong)).getCode());
        }
        String replacement = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_RESET);
        assertEquals(ErrorCode.TOO_MANY_REQUESTS, assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_RESET, replacement)).getCode());
        assertFalse(repository.rows.getLast().getUsed());
    }

    @Test
    void issuanceLimitDoesNotInvalidateExistingCode() {
        service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_RESET);
        when(redis.execute(any(RedisScript.class), anyList(), anyString())).thenReturn(6L);
        assertEquals(ErrorCode.TOO_MANY_REQUESTS, assertThrows(ApiException.class,
                () -> service.limitIssuance("a@b.com", OtpService.PURPOSE_RESET)).getCode());
        assertEquals(1, repository.rows.size());
        assertFalse(repository.rows.getFirst().getUsed());
    }

    @Test
    void redisFailureDoesNotBypassAttemptLimit() {
        String code = service.generateAndSaveOtp("a@b.com", OtpService.PURPOSE_RESET);
        when(redis.execute(any(RedisScript.class), anyList(), anyString())).thenThrow(new IllegalStateException());
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> service.verifyAndConsume("a@b.com", OtpService.PURPOSE_RESET, code)).getCode());
        assertFalse(repository.rows.getFirst().getUsed());
    }

    @Test
    void nonPositiveOtpWindowIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> new AuthProperties(null, null, Duration.ZERO, null, null));
    }

    /** Minimal in-memory stand-in for {@link OtpCodeRepository}; only the used methods are implemented. */
    static final class InMemoryOtpRepository {
        final List<OtpCode> rows = new ArrayList<>();
        boolean atomicConsume;

        OtpCodeRepository proxy() {
            return (OtpCodeRepository) Proxy.newProxyInstance(
                    OtpCodeRepository.class.getClassLoader(),
                    new Class<?>[]{OtpCodeRepository.class},
                    (instance, method, args) -> switch (method.getName()) {
                        case "invalidatePrevious" -> {
                            String identifier = (String) args[0];
                            String purpose = (String) args[1];
                            int changed = 0;
                            synchronized (rows) {
                                for (OtpCode row : rows) {
                                    if (row.getIdentifier().equals(identifier)
                                            && row.getPurpose().equals(purpose)
                                            && Boolean.FALSE.equals(row.getUsed())) {
                                        row.setUsed(true);
                                        changed++;
                                    }
                                }
                            }
                            yield changed;
                        }
                        case "save" -> {
                            OtpCode saved = (OtpCode) args[0];
                            synchronized (rows) {
                                saved.setId((long) (rows.size() + 1));
                                rows.add(saved);
                            }
                            yield saved;
                        }
                        case "findFirstByIdentifierAndPurposeAndUsedFalseOrderByCreatedAtDesc" -> {
                            String identifier = (String) args[0];
                            String purpose = (String) args[1];
                            synchronized (rows) {
                                Optional<OtpCode> found = rows.stream()
                                        .filter(row -> row.getIdentifier().equals(identifier)
                                                && row.getPurpose().equals(purpose)
                                                && Boolean.FALSE.equals(row.getUsed()))
                                        .reduce((first, second) -> second);
                                yield found;
                            }
                        }
                        case "consumeOtp" -> {
                            Long id = (Long) args[0];
                            synchronized (rows) {
                                for (OtpCode row : rows) {
                                    if (row.getId().equals(id) && Boolean.FALSE.equals(row.getUsed())) {
                                        row.setUsed(true);
                                        yield 1;
                                    }
                                }
                            }
                            yield 0;
                        }
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
        }

        int raceTwoVerifications(Runnable action) throws InterruptedException {
            List<Throwable> failures = new ArrayList<>();
            Thread first = new Thread(() -> run(action, failures));
            Thread second = new Thread(() -> run(action, failures));
            first.start();
            second.start();
            first.join();
            second.join();
            return 2 - failures.size();
        }

        private void run(Runnable action, List<Throwable> failures) {
            try {
                action.run();
            } catch (Throwable failure) {
                synchronized (failures) {
                    failures.add(failure);
                }
            }
        }
    }
}

