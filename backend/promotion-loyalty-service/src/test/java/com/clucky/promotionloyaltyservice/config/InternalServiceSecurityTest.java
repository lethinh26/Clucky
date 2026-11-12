package com.clucky.promotionloyaltyservice.config;

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
        mvc.perform(post("/internal/loyalty/preview")).andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/loyalty/preview").header("X-Loyalty-Service-Token", SECRET)).andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/loyalty/preview").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "cart-order-service", 60, SECRET, "test-api")))
                .andExpect(status().isOk());
        for (String role : List.of("CUSTOMER", "ADMIN")) {
            mvc.perform(post("/internal/loyalty/preview").header("Authorization", "Bearer " + token(role, "cart-order-service", 60, SECRET, "test-api")))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(post("/internal/loyalty/preview").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "unrelated-service", 60, SECRET, "test-api")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/internal/loyalty/not-an-authorized-operation").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "cart-order-service", 60, SECRET, "test-api")))
                .andExpect(status().isForbidden());
    }

    @Test
    void signatureAudienceExpiryAndRevocationStillApply() throws Exception {
        for (String invalid : List.of(token("INTERNAL_SERVICE", "cart-order-service", 60, SECRET + "wrong-key", "test-api"),
                token("INTERNAL_SERVICE", "cart-order-service", -120, SECRET, "test-api"),
                token("INTERNAL_SERVICE", "cart-order-service", 60, SECRET, "wrong-api"))) {
            mvc.perform(post("/internal/loyalty/preview").header("Authorization", "Bearer " + invalid)).andExpect(status().isUnauthorized());
        }
        when(context.getBean(StringRedisTemplate.class).hasKey("auth:revoked:sid:internal-test")).thenReturn(true);
        mvc.perform(post("/internal/loyalty/preview").header("Authorization", "Bearer " + token("INTERNAL_SERVICE", "cart-order-service", 60, SECRET, "test-api")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicBannersAndAdminWritesPreserveVoucherProposalPermissions() throws Exception {
        mvc.perform(get("/api/promotions/banners")).andExpect(status().isOk());
        mvc.perform(get("/api/promotions/banners/admin")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/promotions/banners")).andExpect(status().isUnauthorized());
        for (String role : List.of("CUSTOMER", "STAFF", "STORE_MANAGER", "ADMIN")) {
            String authorization = "Bearer " + token(role, "browser-test", 60, SECRET, "test-api");
            int adminStatus = role.equals("ADMIN") ? 200 : 403;
            mvc.perform(get("/api/promotions/banners/admin").header("Authorization", authorization)).andExpect(status().is(adminStatus));
            mvc.perform(post("/api/promotions/banners").header("Authorization", authorization)).andExpect(status().is(adminStatus));
            mvc.perform(put("/api/promotions/banners/1").header("Authorization", authorization)).andExpect(status().is(adminStatus));
            mvc.perform(post("/api/promotions/banners/1/image").header("Authorization", authorization)).andExpect(status().is(adminStatus));
            mvc.perform(delete("/api/promotions/banners/1").header("Authorization", authorization)).andExpect(status().is(adminStatus));
            mvc.perform(post("/api/promotions/vouchers/store-proposals").header("Authorization", authorization))
                    .andExpect(status().is(role.equals("STORE_MANAGER") ? 200 : 403));
            for (String action : List.of("approve", "reject")) {
                mvc.perform(put("/api/promotions/vouchers/1/" + action).header("Authorization", authorization)).andExpect(status().is(adminStatus));
            }
        }
    }

    private String token(String role, String service, long expiresIn, String secret, String audience) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer("test-issuer").audience(List.of(audience)).subject("123")
                .issuedAt(now.minusSeconds(180)).expiresAt(now.plusSeconds(expiresIn)).claim("typ", "access")
                .claim("role", role).claim("storeId", 1L).claim("service", service).claim("sid", "internal-test").build();
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
        @RequestMapping({"/internal/loyalty/**", "/api/promotions/**"}) String probe() { return "ok"; }
    }
}
