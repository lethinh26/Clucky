package com.clucky.identityservice.config;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CsrfOriginFilterTest {
    @Test
    void cookieEndpointsRequireTrustedOrigin() throws Exception {
        var filter = new CsrfOriginFilter(new AuthProperties(null, null, null, null,
                List.of("http://localhost:3000")), new ObjectMapper().findAndRegisterModules());
        for (String path : List.of("/api/auth/logout", "/api/auth/refresh", "/api/auth/google", "/api/auth/google/complete")) {
            for (String origin : new String[]{null, "https://untrusted.example", "http://localhost:3000"}) {
                var request = new MockHttpServletRequest("POST", path);
                if (origin != null) request.addHeader("Origin", origin);
                var response = new MockHttpServletResponse();
                var called = new AtomicBoolean();
                filter.doFilter(request, response, (incoming, outgoing) -> called.set(true));
                boolean allowed = "http://localhost:3000".equals(origin);
                assertEquals(allowed, called.get());
                assertEquals(allowed ? 200 : 403, response.getStatus());
            }
        }
    }
}
