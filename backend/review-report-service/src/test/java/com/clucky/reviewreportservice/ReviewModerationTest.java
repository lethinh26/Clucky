package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.client.OrderServiceClient;
import com.clucky.reviewreportservice.client.RestOrderServiceClient;
import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.controller.ReviewController;
import com.clucky.reviewreportservice.dto.CreateReplyRequest;
import com.clucky.reviewreportservice.dto.HideReviewRequest;
import com.clucky.reviewreportservice.dto.ReviewDto;
import com.clucky.reviewreportservice.dto.Role;
import com.clucky.reviewreportservice.dto.SoftDeleteReviewRequest;
import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewReply;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.repository.ReviewReplyRepository;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import com.clucky.reviewreportservice.service.ReviewAuditOutbox;
import com.clucky.reviewreportservice.service.ReviewIdempotencyStore;
import com.clucky.reviewreportservice.service.ReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.OffsetDateTime;
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
            assertThrows(AccessDeniedException.class,
                    () -> context.getBean(ReviewController.class).softDeleteReview(1L, null, null, null));
            authenticate("STORE_MANAGER", 2L);
            assertThrows(AccessDeniedException.class,
                    () -> context.getBean(ReviewController.class).softDeleteReview(1L, null, null, null));
            authenticate("CUSTOMER", null);
            assertThrows(AccessDeniedException.class,
                    () -> context.getBean(ReviewController.class).replyReview(1L, new CreateReplyRequest("Reply")));
            assertThrows(AccessDeniedException.class,
                    () -> context.getBean(ReviewController.class).softDeleteReview(1L, null, null, null));
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

    @Test
    void rejectsStaffAndManagerWithoutStoreIdClaim() {
        for (String role : List.of("STAFF", "STORE_MANAGER")) {
            authenticate(role, null);
            assertThrows(ForbiddenException.class,
                    () -> service.listModerationReviews(null, null, null, null, null, null, 0, 20));
            assertThrows(ForbiddenException.class, () -> service.getModerationSummary(null));
            assertThrows(ForbiddenException.class, () -> service.addReply(1L, new CreateReplyRequest("Thanks")));
        }
        authenticate("STORE_MANAGER", null);
        assertThrows(ForbiddenException.class, () -> service.hideReview(1L, null));
        verifyNoInteractions(orders, replies, audit);
    }

    @Test
    void enforcesAdminSoftDeleteAndPreservesRecordAndAudit() {
        authenticate("STORE_MANAGER", 2L);
        assertThrows(ForbiddenException.class, () -> service.softDeleteReview(1L));

        authenticate("ADMIN", null);
        ReviewDto deleted = service.softDeleteReview(1L, new SoftDeleteReviewRequest("Policy violation", 0L), null);
        assertEquals(ReviewStatus.DELETED, deleted.status());
        assertEquals(ReviewStatus.DELETED, review.getStatus());
        assertEquals(9L, review.getDeletedBy());
        assertNotNull(review.getDeletedAt());
        verify(reviews, never()).delete(any(Review.class));
        verify(audit, times(1)).record(new CurrentActor(9L, Role.ADMIN, null), 2L, "SOFT_DELETE_REVIEW", 1L,
                Map.of("status", "VISIBLE"), Map.of("status", "DELETED"));

        service.softDeleteReview(1L);
        verifyNoMoreInteractions(audit);
    }

    @Test
    void rejectsStaleVersionAndMutatingDeletedReviews() {
        review.setVersion(2L);
        authenticate("ADMIN", null);
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.hideReview(1L, new HideReviewRequest("spam", 1L))).getCode());
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.softDeleteReview(1L, new SoftDeleteReviewRequest("spam", 1L), null)).getCode());

        review.setStatus(ReviewStatus.DELETED);
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.hideReview(1L, new HideReviewRequest("spam", 2L))).getCode());
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.addReply(1L, new CreateReplyRequest("Reply"))).getCode());
        verifyNoInteractions(replies, audit);
    }

    @Test
    @SuppressWarnings("unchecked")
    void moderationListingAndSummaryEnforceStoreScopeAndExcludeDeletedForNonAdmin() {
        authenticate("STORE_MANAGER", 2L);
        assertThrows(ForbiddenException.class,
                () -> service.listModerationReviews(3L, null, null, null, null, null, 0, 20));
        assertThrows(ForbiddenException.class, () -> service.getModerationSummary(3L));
        assertTrue(service.listModerationReviews(null, ReviewStatus.DELETED, null, null, null, null, 0, 20)
                .content().isEmpty());

        when(reviews.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(review)));
        when(replies.findByReviewIdInOrderByCreatedAtAsc(List.of(1L))).thenReturn(List.of());
        assertEquals(1, service.listModerationReviews(2L, null, null, null, null, null, 0, 20).content().size());

        when(reviews.countByStatus(ReviewStatus.VISIBLE)).thenReturn(3L);
        when(reviews.countByStatus(ReviewStatus.HIDDEN)).thenReturn(1L);
        when(reviews.countByStatus(ReviewStatus.DELETED)).thenReturn(2L);
        when(reviews.countUnrepliedVisible()).thenReturn(2L);
        when(reviews.averageRatingByStatus(ReviewStatus.VISIBLE)).thenReturn(4.25);

        authenticate("ADMIN", null);
        var summary = service.getModerationSummary(null);
        assertEquals(4L, summary.totalReviews());
        assertEquals(3L, summary.visibleCount());
        assertEquals(1L, summary.hiddenCount());
        assertEquals(2L, summary.deletedCount());
        assertEquals(2L, summary.unrepliedVisibleCount());
        assertEquals(4.3, summary.averageRating());
    }

    @Test
    @SuppressWarnings("unchecked")
    void idempotencyStoreReplaysMatchingPayloadAndRejectsConflict() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        ReviewIdempotencyStore store = new ReviewIdempotencyStore(jdbc, mapper);

        String hash = store.hashRequest(Map.of("reviewId", 1L, "reason", "spam"));
        String mismatchHash = store.hashRequest(Map.of("reviewId", 1L, "reason", "other"));
        assertNotEquals(hash, mismatchHash);

        when(jdbc.update(startsWith("INSERT"), any(), any(), any(), any(), any())).thenReturn(1);
        assertTrue(store.reserveOrReplay("SOFT_DELETE_REVIEW", 9L, 1L, "key-1", hash, ReviewDto.class).isEmpty());

        ReviewDto cached = new ReviewDto(1L, 7L, 20L, 10L, 2L, 5, "Great food",
                ReviewStatus.DELETED, 1L, OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(), List.of());
        store.complete("SOFT_DELETE_REVIEW", 9L, "key-1", 200, cached);
        verify(jdbc).update(startsWith("UPDATE"), eq(200), anyString(), eq("SOFT_DELETE_REVIEW"), eq(9L), eq("key-1"));

        String cachedJson = mapper.writeValueAsString(cached);
        when(jdbc.update(startsWith("INSERT"), any(), any(), any(), any(), any())).thenReturn(0);
        when(jdbc.query(startsWith("SELECT"), any(RowMapper.class), eq("SOFT_DELETE_REVIEW"), eq(9L), eq("key-1")))
                .thenAnswer(invocation -> {
                    RowMapper<?> rowMapper = invocation.getArgument(1);
                    java.sql.ResultSet rs = mock(java.sql.ResultSet.class);
                    when(rs.getString("request_hash")).thenReturn(hash);
                    when(rs.getInt("response_status")).thenReturn(200);
                    when(rs.getString("response_body")).thenReturn(cachedJson);
                    return List.of(rowMapper.mapRow(rs, 0));
                });

        var replayed = store.reserveOrReplay("SOFT_DELETE_REVIEW", 9L, 1L, "key-1", hash, ReviewDto.class);
        assertTrue(replayed.isPresent());
        assertEquals(ReviewStatus.DELETED, replayed.get().status());
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> store.reserveOrReplay("SOFT_DELETE_REVIEW", 9L, 1L, "key-1", mismatchHash, ReviewDto.class)).getCode());
    }

    private void authenticate(String role, Long storeId) {
        var builder = Jwt.withTokenValue("test-token").header("alg", "HS256").subject("9").claim("role", role);
        if (storeId != null) { builder.claim("storeId", storeId); }
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(),
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
