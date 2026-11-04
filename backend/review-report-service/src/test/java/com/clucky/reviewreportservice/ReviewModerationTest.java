package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.client.OrderServiceClient;
import com.clucky.reviewreportservice.client.RestOrderServiceClient;
import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.controller.ReviewController;
import com.clucky.reviewreportservice.dto.CreateReplyRequest;
import com.clucky.reviewreportservice.dto.HideReviewRequest;
import com.clucky.reviewreportservice.dto.Role;
import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewReply;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.repository.ReviewReplyRepository;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import com.clucky.reviewreportservice.service.ReviewAuditOutbox;
import com.clucky.reviewreportservice.service.ReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReviewModerationTest {
    private final ReviewRepository reviews = mock(ReviewRepository.class);
    private final ReviewReplyRepository replies = mock(ReviewReplyRepository.class);
    private final OrderServiceClient orders = mock(OrderServiceClient.class);
    private final ReviewAuditOutbox audit = mock(ReviewAuditOutbox.class);
    private final ReviewService service = new ReviewService(reviews, orders, replies, audit);
    private final Review review = new Review(7L, 20L, 10L, 5, "Great food");

    @BeforeEach
    void prepareReview() {
        review.setId(1L);
        when(reviews.findById(1L)).thenReturn(Optional.of(review));
        when(orders.getOrderStoreId(10L)).thenReturn(2L);
    }

    @AfterEach
    void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test
    void rejectsStaffHideAndWrongStoreBeforeMutation() {
        authenticate("STAFF", 2L);
        assertThrows(ForbiddenException.class, () -> service.hideReview(1L, null));
        authenticate("STORE_MANAGER", 3L);
        assertThrows(ForbiddenException.class, () -> service.hideReview(1L, null));
        assertThrows(ForbiddenException.class, () -> service.addReply(1L, new CreateReplyRequest("Reply")));
        assertEquals(ReviewStatus.VISIBLE, review.getStatus());
        verifyNoInteractions(replies, audit);
    }

    @Test
    void recordsActualStoreAndDoesNotRepeatHideMutation() {
        authenticate("ADMIN", null);
        service.hideReview(1L, new HideReviewRequest("Free text must not enter audit"));
        service.hideReview(1L, null);
        assertEquals(ReviewStatus.HIDDEN, review.getStatus());
        verify(audit, times(1)).record(new CurrentActor(9L, Role.ADMIN, null), 2L, "HIDE_REVIEW", 1L,
                Map.of("status", "VISIBLE"), Map.of("status", "HIDDEN"));
        verifyNoMoreInteractions(audit);
    }

    @Test
    void recordsReplyIdentityWithoutFreeText() {
        authenticate("STAFF", 2L);
        when(replies.save(any(ReviewReply.class))).thenAnswer(invocation -> {
            ReviewReply reply = invocation.getArgument(0);
            reply.setId(5L);
            return reply;
        });
        assertEquals(9L, service.addReply(1L, new CreateReplyRequest("Private text")).responderId());
        verify(audit).record(new CurrentActor(9L, Role.STAFF, 2L), 2L, "REPLY_REVIEW", 1L,
                Map.of(), Map.of("replyId", 5L));
    }

    @Test
    void orderFailureCannotAuthorizeModeration() {
        authenticate("STORE_MANAGER", 2L);
        when(orders.getOrderStoreId(10L)).thenThrow(new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE));
        assertThrows(ApiException.class, () -> service.hideReview(1L, null));
        assertThrows(ApiException.class, () -> service.addReply(1L, new CreateReplyRequest("Reply")));
        assertEquals(ReviewStatus.VISIBLE, review.getStatus());
        verifyNoInteractions(replies, audit);
    }

    @Test
    void enforcesControllerRolesAndReasonLimit() throws Exception {
        try (var context = new AnnotationConfigApplicationContext(ReviewSafetyTest.MethodSecurityConfig.class)) {
            authenticate("STAFF", 2L);
            assertThrows(AccessDeniedException.class, () -> context.getBean(ReviewController.class).hideReview(1L, null));
            authenticate("CUSTOMER", null);
            assertThrows(AccessDeniedException.class,
                    () -> context.getBean(ReviewController.class).replyReview(1L, new CreateReplyRequest("Reply")));
        }
        ReviewService mockService = mock(ReviewService.class);
        MockMvcBuilders.standaloneSetup(new ReviewController(mockService)).build()
                .perform(put("/api/reviews/1/hide").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(mockService);
    }

    @Test
    void storeClientRelaysJwtAndNeverUsesFallbackStore() {
        authenticate("STORE_MANAGER", 2L);
        RestTemplate template = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(template).build();
        RestOrderServiceClient client = new RestOrderServiceClient(template);
        String url = "http://cart-order-service/api/internal/orders/10/store";
        server.expect(requestTo(url)).andExpect(header("Authorization", "Bearer test-token"))
                .andRespond(withSuccess("{\"orderId\":10,\"storeId\":2}", MediaType.APPLICATION_JSON));
        assertEquals(2L, client.getOrderStoreId(10L));
        server.verify();
        for (HttpStatus failure : List.of(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.SERVICE_UNAVAILABLE)) {
            server.reset();
            server.expect(requestTo(url)).andRespond(withStatus(failure));
            assertThrows(ApiException.class, () -> client.getOrderStoreId(10L));
            server.verify();
        }
        server.reset();
        server.expect(requestTo(url)).andRespond(withException(new IOException("Timeout")));
        assertThrows(ApiException.class, () -> client.getOrderStoreId(10L));
        server.verify();
        server.reset();
        server.expect(requestTo(url)).andRespond(withSuccess("{\"orderId\":11,\"storeId\":2}", MediaType.APPLICATION_JSON));
        assertEquals(ErrorCode.UPSTREAM_ERROR,
                assertThrows(ApiException.class, () -> client.getOrderStoreId(10L)).getCode());
        server.verify();
    }

    @Test
    void outboxContainsCorrelatedEventAndPropagatesWriteFailure() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        ReviewAuditOutbox outbox = new ReviewAuditOutbox(jdbc, mapper);
        CurrentActor actor = new CurrentActor(9L, Role.ADMIN, null);
        outbox.record(actor, 2L, "HIDE_REVIEW", 1L, Map.of("status", "VISIBLE"), Map.of("status", "HIDDEN"));
        ArgumentCaptor<String> serialized = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> eventId = ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(anyString(), eventId.capture(), serialized.capture());
        var event = mapper.readTree(serialized.getValue());
        assertEquals(eventId.getValue(), event.path("eventId").asText());
        assertFalse(event.path("correlationId").asText().isBlank());
        assertEquals("audit.recorded", event.path("eventType").asText());
        assertEquals(2L, event.path("payload").path("storeId").asLong());
        assertEquals("HIDDEN", event.path("payload").path("after").path("status").asText());
        when(jdbc.update(anyString(), anyString(), anyString())).thenThrow(new IllegalStateException("Database unavailable"));
        assertThrows(IllegalStateException.class,
                () -> outbox.record(actor, 2L, "HIDE_REVIEW", 1L, Map.of(), Map.of("status", "HIDDEN")));
    }

    private void authenticate(String role, Long storeId) {
        var builder = Jwt.withTokenValue("test-token").header("alg", "HS256").subject("9").claim("role", role);
        if (storeId != null) { builder.claim("storeId", storeId); }
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(),
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
