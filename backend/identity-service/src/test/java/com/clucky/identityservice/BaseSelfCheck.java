package com.clucky.identityservice;

import com.clucky.identityservice.config.AccessGuard;
import com.clucky.identityservice.config.AccessTokenValidator;
import com.clucky.identityservice.config.RedisConfig;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.dto.ApiError;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.dto.DomainEvent;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.mapper.DomainMapper;
import com.clucky.identityservice.mapper.EventMapper;
import jakarta.validation.Validation;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public final class BaseSelfCheck {
    public static void main(String[] args) throws Exception {
        Instant now = Instant.now();
        ApiError localizedContract = ApiError.of(ErrorCode.VOUCHER_EXPIRED, "/api/promotions/vouchers/validate");
        require(localizedContract.status() == 409 && localizedContract.code().equals("VOUCHER_EXPIRED"), "Wrong error contract");
        require(localizedContract.message().equals(ErrorCode.VOUCHER_EXPIRED.message()), "Error message bypassed catalog");
        Jwt staff = Jwt.withTokenValue("self-check").header("alg", "HS256").subject("7")
                .issuedAt(now).expiresAt(now.plusSeconds(60)).claim("aud", List.of("clucky-api"))
                .claim("role", "STAFF").claim("storeId", 11L).build();
        AccessTokenValidator validator = new AccessTokenValidator("clucky-api");
        require(!validator.validate(staff).hasErrors(), "Valid staff claims rejected");
        require(new AccessTokenValidator("wrong-audience").validate(staff).hasErrors(), "Wrong audience accepted");
        Jwt noStore = Jwt.withTokenValue("self-check").header("alg", "HS256").subject("7")
                .expiresAt(now.plusSeconds(60)).claim("aud", List.of("clucky-api")).claim("role", "STAFF").build();
        require(validator.validate(noStore).hasErrors(), "Staff without store accepted");
        Jwt noExpiry = Jwt.withTokenValue("self-check").header("alg", "HS256").subject("7")
                .claim("aud", List.of("clucky-api")).claim("role", "CUSTOMER").build();
        require(validator.validate(noExpiry).hasErrors(), "Token without expiry accepted");
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(staff,
                List.of(new SimpleGrantedAuthority("ROLE_STAFF"))));
        try {
            AccessGuard guard = new AccessGuard();
            guard.requireOwner(7L);
            guard.requireStore(11L);
            require(guard.effectiveStore(null).equals(11L), "Store scope not enforced");
            denied(() -> guard.requireStore(12L));
            denied(() -> guard.requireOwner(8L));
        } finally {
            SecurityContextHolder.clearContext();
        }
        RedisConfig.Policy policy = new RedisConfig.Policy(Map.of("otp", Duration.ofMinutes(5)));
        require(policy.duration("otp").equals(Duration.ofMinutes(5)), "Wrong OTP TTL");
        require(RedisConfig.key("cart:guest", "session").equals("cart:guest:session"), "Wrong Redis key");
        invalid(() -> RedisConfig.key("cart", "guest:session"));
        invalid(() -> RedisConfig.untilExpiry(now, now));
        invalid(() -> RedisConfig.untilExpiry(now.minusSeconds(1), now));
        invalid(() -> RedisConfig.untilExpiry(null, now));
        invalid(() -> new RedisConfig.Policy(Map.of("otp", Duration.ZERO)));
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            EventMapper events = new EventMapper(mapper, factory.getValidator());
            DomainEvent original = new DomainEvent("event-1", "trace-1", "order.created", "cart-order-service",
                    now, mapper.createObjectNode().put("orderId", 42));
            String json = events.toJson(original);
            require(events.fromJson(json, "order.created").eventId().equals(original.eventId()), "Event ID changed");
            invalid(() -> events.fromJson(json, "payment.confirmed"));
            invalid(() -> events.fromJson("null", "order.created"));
            invalid(() -> events.fromJson("{}", "order.created"));
            invalid(() -> events.fromJson(json + " {}", "order.created"));
            invalid(() -> events.toJson(new DomainEvent("event-1", "bad\nheader", "order.created",
                    "cart-order-service", now, mapper.createObjectNode())));
            invalid(() -> events.toJson(new DomainEvent("event-1", "trace-1", "order.created",
                    "cart-order-service", now, mapper.createArrayNode())));
        }
        User user = new User();
        user.setId(7L);
        user.setRole(Role.CUSTOMER);
        user.setPasswordHash("must-not-leak");
        String response = new ObjectMapper().findAndRegisterModules().writeValueAsString(DomainMapper.toResponse(user));
        require(!response.contains("must-not-leak") && !response.contains("passwordHash"), "Password leaked in DTO");
        System.out.println("Base self-check passed");
    }

    private static void denied(Runnable action) {
        try { action.run(); }
        catch (AccessDeniedException expected) { return; }
        throw new AssertionError("Unauthorized access accepted");
    }

    private static void invalid(Runnable action) {
        try { action.run(); }
        catch (IllegalArgumentException expected) { return; }
        throw new AssertionError("Invalid input accepted");
    }

    private static void require(boolean condition, String message) {
        if (!condition) { throw new AssertionError(message); }
    }
}
