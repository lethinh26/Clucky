package com.clucky.paymentservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;

class SepayWebhookSecurityTest {
    @Test
    void onlyConfiguredApiKeyReachesTheHandler() throws Exception {
        for (String header : new String[]{"", "Bearer test-key", "Apikey wrong-key", "Apikey test-key"}) {
            var request = new MockHttpServletRequest("POST", SepayWebhookSecurity.PATH);
            if (!header.isEmpty()) request.addHeader("Authorization", header);
            var response = new MockHttpServletResponse();
            var reached = new AtomicBoolean();
            new SepayWebhookSecurity.ApiKeyFilter("test-key", new ObjectMapper().findAndRegisterModules())
                    .doFilter(request, response, (incoming, outgoing) -> reached.set(true));
            assertEquals(header.equals("Apikey test-key"), reached.get());
            assertEquals(reached.get() ? 200 : 401, response.getStatus());
            assertFalse(response.getContentAsString().contains("test-key"));
        }
    }

    @Test
    void missingKeyDuplicateHeadersAndOversizeFailClosed() throws Exception {
        for (int scenario = 0; scenario < 3; scenario++) {
            var request = new MockHttpServletRequest("POST", SepayWebhookSecurity.PATH);
            request.addHeader("Authorization", "Apikey test-key");
            if (scenario == 1) request.addHeader("Authorization", "Apikey test-key");
            if (scenario == 2) request.setContent(new byte[SepayWebhookSecurity.MAX_BODY_BYTES + 1]);
            var response = new MockHttpServletResponse();
            var reached = new AtomicBoolean();
            new SepayWebhookSecurity.ApiKeyFilter(scenario == 0 ? "" : "test-key", new ObjectMapper().findAndRegisterModules())
                    .doFilter(request, response, (incoming, outgoing) -> reached.set(true));
            assertFalse(reached.get());
            assertEquals(scenario == 0 ? 503 : scenario == 1 ? 401 : 413, response.getStatus());
        }
    }
}
