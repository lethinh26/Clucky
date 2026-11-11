package com.clucky.cartorderservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.Filter;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InternalServiceSecurityTest {
    private static final String SECRET = "test-only-internal-secret-at-least-32-bytes";
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.setEnvironment(new MockEnvironment().withProperty("clucky.security.jwt.secret", SECRET)
                .withProperty("clucky.security.jwt.issuer", "test-issuer").withProperty("clucky.security.jwt.audience", "test-api"));
        context.register(TestConfig.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
    }

    @AfterEach
    void close() { context.close(); }

    @Test
    void onlyTheExpectedServiceMayUseInternalRoutes() throws Exception {
        mvc.perform(get("/internal/loyalty/orders/1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/internal/loyalty/orders/1").header("X-Loyalty-Service-Token", SECRET)).andExpect(status().isUnauthorized());
        mvc.perform(get("/internal/loyalty/orders/1").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "promotion-loyalty-service", 60, SECRET, "test-api")))
                .andExpect(status().isOk());
        for (String role : List.of("CUSTOMER", "ADMIN")) {
            mvc.perform(get("/internal/loyalty/orders/1").header("Authorization", "Bearer " + token(role, "promotion-loyalty-service", 60, SECRET, "test-api")))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(get("/internal/loyalty/orders/1").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "unrelated-service", 60, SECRET, "test-api")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/internal/loyalty/not-an-authorized-operation").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "promotion-loyalty-service", 60, SECRET, "test-api")))
                .andExpect(status().isForbidden());
    }

    @Test
    void signatureAudienceExpiryAndRevocationStillApply() throws Exception {
        for (String invalid : List.of(token("INTERNAL_SERVICE", "promotion-loyalty-service", 60, SECRET + "wrong-key", "test-api"),
                token("INTERNAL_SERVICE", "promotion-loyalty-service", -120, SECRET, "test-api"),
                token("INTERNAL_SERVICE", "promotion-loyalty-service", 60, SECRET, "wrong-api"))) {
            mvc.perform(get("/internal/loyalty/orders/1").header("Authorization", "Bearer " + invalid)).andExpect(status().isUnauthorized());
        }
        when(context.getBean(StringRedisTemplate.class).hasKey("auth:revoked:sid:internal-test")).thenReturn(true);
        mvc.perform(get("/internal/loyalty/orders/1").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "promotion-loyalty-service", 60, SECRET, "test-api")))
                .andExpect(status().isUnauthorized());
    }

    private String token(String role, String service, long expiresIn, String secret, String audience) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer("test-issuer").audience(List.of(audience)).subject("123")
                .issuedAt(now.minusSeconds(180)).expiresAt(now.plusSeconds(expiresIn)).claim("typ", "access")
                .claim("role", role).claim("service", service).claim("sid", "internal-test").build();
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(secret.getBytes(StandardCharsets.UTF_8)));
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @EnableWebSecurity
    @Import(SecurityConfig.class)
    static class TestConfig {
        @Bean ObjectMapper mapper() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean StringRedisTemplate redis() { return mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS); }
        @Bean ProbeController probe() { return new ProbeController(); }
    }

    @RestController
    static class ProbeController {
        @RequestMapping("/internal/loyalty/**") String probe() { return "ok"; }
    }
}
