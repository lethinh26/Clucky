package com.clucky.catalogstoreservice.config;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RedisConfig.Policy.class)
public class RedisConfig {
    @ConfigurationProperties("clucky.redis")
    public record Policy(Map<String, Duration> ttl) {
        public Policy {
            if (ttl == null || ttl.isEmpty() || ttl.values().stream()
                    .anyMatch(value -> value == null || value.isNegative() || value.isZero())) {
                throw new IllegalArgumentException("Redis TTL policies must be positive");
            }
            ttl = Map.copyOf(ttl);
        }

        public Duration duration(String purpose) {
            Duration value = ttl.get(purpose);
            if (value == null) { throw new IllegalArgumentException("Unknown Redis TTL purpose"); }
            return value;
        }
    }

    public static String key(String prefix, String identifier) {
        if (prefix == null || !java.util.Set.of("cart", "cart:guest", "menu:store", "otp",
                "auth:google:pending", "payment:pending", "rate-limit").contains(prefix)
                || identifier == null || identifier.isBlank() || identifier.length() > 255
                || identifier.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Invalid Redis key");
        }
        if ((prefix.equals("cart") || prefix.equals("menu:store")) && !identifier.matches("[1-9][0-9]*")) {
            throw new IllegalArgumentException("Redis resource ID must be positive");
        }
        return prefix + ":" + identifier;
    }

    public static Duration untilExpiry(Instant expiresAt, Instant now) {
        if (expiresAt == null || now == null) { throw new IllegalArgumentException("Expiry and current time are required"); }
        Duration ttl = Duration.between(now, expiresAt);
        if (ttl.isNegative() || ttl.isZero()) { throw new IllegalArgumentException("Expiry must be in the future"); }
        return ttl;
    }
}
