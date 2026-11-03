package com.clucky.identityservice;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.clucky.identityservice.config.CorrelationIdFilter;
import com.clucky.identityservice.dto.DomainEvent;
import com.clucky.identityservice.logging.KafkaLogging;
import com.clucky.identityservice.logging.SafeLog;
import com.clucky.identityservice.mapper.EventMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockAsyncContext;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

public final class LoggingSelfCheck {
    public static void main(String[] args) throws Exception {
        RuntimeException failure = new RuntimeException("password=secret", new IOException("Bearer secret"));
        failure.addSuppressed(new IllegalStateException("otp=secret"));
        String trace = SafeLog.trace(failure);
        require(!trace.contains("secret") && trace.contains("LoggingSelfCheck.java"), "Unsafe or missing stack frames");
        require(SafeLog.token("injected\nentry").equals("unknown"), "Log injection accepted");
        Logger logger = (Logger) LoggerFactory.getLogger(CorrelationIdFilter.class);
        ListAppender<ILoggingEvent> logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
        MDC.put("correlationId", "outer");
        try {
            CorrelationIdFilter filter = new CorrelationIdFilter();
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/orders/secret");
            request.setQueryString("token=secret");
            request.addHeader("X-Correlation-ID", "request-1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, (incoming, outgoing) -> {
                incoming.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/orders/{id}");
                require("request-1".equals(MDC.get("correlationId")), "MDC missing during request");
            });
            require(logs.list.size() == 1 && logs.list.getFirst().getFormattedMessage().contains("status=200"), "Request not logged once");
            require("outer".equals(MDC.get("correlationId")), "Previous MDC not restored");
            require("request-1".equals(response.getHeader("X-Correlation-ID")), "Response correlation missing");
            MockHttpServletRequest denied = new MockHttpServletRequest("GET", "/secret");
            denied.addHeader("X-Correlation-ID", "bad\ninjected");
            MockHttpServletResponse deniedResponse = new MockHttpServletResponse();
            filter.doFilter(denied, deniedResponse, (incoming, outgoing) -> {
                incoming.setAttribute(CorrelationIdFilter.ERROR_CODE, "FORBIDDEN");
                deniedResponse.setStatus(403);
            });
            require(logs.list.getLast().getFormattedMessage().contains("event=security_denied"), "Denied request missing");
            require(!deniedResponse.getHeader("X-Correlation-ID").contains("\n"), "Unsafe correlation accepted");
            MockHttpServletRequest async = new MockHttpServletRequest("GET", "/async");
            async.setAsyncSupported(true);
            MockHttpServletResponse asyncResponse = new MockHttpServletResponse();
            int before = logs.list.size();
            filter.doFilter(async, asyncResponse, (incoming, outgoing) -> incoming.startAsync(incoming, outgoing));
            require(logs.list.size() == before, "Async request logged too early");
            ((MockAsyncContext) async.getAsyncContext()).complete();
            require(logs.list.size() == before + 1, "Async completion not logged once");
            try {
                filter.doFilter(new MockHttpServletRequest("GET", "/error"), new MockHttpServletResponse(),
                        (incoming, outgoing) -> { throw new IOException("secret"); });
                throw new AssertionError("Failure swallowed");
            } catch (IOException expected) {
                require(logs.list.getLast().getFormattedMessage().contains("status=500"), "Unhandled failure logged as success");
            }
            require(logs.list.stream().noneMatch(entry -> entry.getFormattedMessage().contains("secret")), "Sensitive request data leaked");
        } finally {
            logger.detachAppender(logs);
            logs.stop();
            MDC.clear();
        }
        KafkaLogging kafka = new KafkaLogging();
        ConsumerRecord<Object, Object> record = new ConsumerRecord<>("order.created", 0, 1, "order-1", "secret payload");
        record.headers().add("X-Correlation-ID", "request-1".getBytes(StandardCharsets.UTF_8));
        record.headers().add("X-Event-ID", "event-1".getBytes(StandardCharsets.UTF_8));
        MDC.put("correlationId", "outer");
        try {
            kafka.intercept(record, null);
            require("event-1".equals(MDC.get("eventId")), "Kafka context missing");
            kafka.afterRecord(record, null);
            require("outer".equals(MDC.get("correlationId")) && MDC.get("eventId") == null, "Kafka context leaked");
            ConsumerRecord<Object, Object> missingHeaders = new ConsumerRecord<>("order.created", 0, 2, null, "secret");
            kafka.intercept(missingHeaders, null);
            require("unknown".equals(MDC.get("correlationId")), "Previous event correlation reused");
            kafka.clearThreadState(null);
        } finally { MDC.clear(); }
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            EventMapper events = new EventMapper(mapper, factory.getValidator());
            var outbound = events.toRecord(new DomainEvent("event-1", "request-1", "order.created",
                    "identity-service", Instant.now(), mapper.createObjectNode()), "order-1");
            require("order-1".equals(outbound.key()), "Aggregate ordering key lost");
            require("event-1".equals(KafkaLogging.header(outbound.headers(), "X-Event-ID")), "Event header missing");
        }
        System.out.println("Logging self-check passed");
    }

    private static void require(boolean condition, String message) {
        if (!condition) { throw new AssertionError(message); }
    }
}
