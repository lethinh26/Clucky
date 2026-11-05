package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.client.OrderServiceClient;
import com.clucky.reviewreportservice.client.OrderServiceClient.OrderVerificationDto;
import com.clucky.reviewreportservice.client.RestOrderServiceClient;
import com.clucky.reviewreportservice.controller.ReviewController;
import com.clucky.reviewreportservice.dto.CreateReviewRequest;
import com.clucky.reviewreportservice.dto.UpdateReviewRequest;
import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.entity.ReviewReply;
import com.clucky.reviewreportservice.entity.ReviewStatus;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.mapper.DomainMapper;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import com.clucky.reviewreportservice.repository.ReviewReplyRepository;
import com.clucky.reviewreportservice.service.ReviewAuditOutbox;
import com.clucky.reviewreportservice.service.ReviewService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ReviewSafetyTest {
    private final CreateReviewRequest request = new CreateReviewRequest(10L, 20L, 5, "Great food");

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesJwtIdentityAndRejectsNonCustomers() {
        try (var context = new AnnotationConfigApplicationContext(MethodSecurityConfig.class)) {
            ReviewController controller = context.getBean(ReviewController.class);
            ReviewService service = context.getBean(ReviewService.class);
            authenticate("CUSTOMER");
            controller.createReview(request);
            verify(service).createReview(7L, request);
            authenticate("STAFF");
            assertThrows(AccessDeniedException.class, () -> controller.createReview(request));
            verifyNoMoreInteractions(service);
        }
    }

    @Test
    void relaysJwtAndRejectsHttpFailures() {
        authenticate("CUSTOMER");
        RestTemplate template = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(template).build();
        RestOrderServiceClient client = new RestOrderServiceClient(template);
        String url = "http://cart-order-service/api/internal/orders/10/verification?customerId=7";
        server.expect(requestTo(url)).andExpect(header("Authorization", "Bearer test-token"))
                .andRespond(withSuccess("""
                        {"id":10,"orderCode":"ORD-10","customerId":7,"status":"COMPLETED","productIds":[20]}
                        """, MediaType.APPLICATION_JSON));
        assertEquals(List.of(20L), client.getOrderForReview(10L, 7L).productIds());
        server.verify();

        for (HttpStatus status : List.of(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN,
                HttpStatus.INTERNAL_SERVER_ERROR, HttpStatus.SERVICE_UNAVAILABLE)) {
            server.reset();
            server.expect(requestTo(url)).andRespond(withStatus(status));
            ErrorCode expected = switch (status) {
                case UNAUTHORIZED -> ErrorCode.UNAUTHENTICATED;
                case FORBIDDEN -> ErrorCode.FORBIDDEN;
                case SERVICE_UNAVAILABLE -> ErrorCode.DEPENDENCY_UNAVAILABLE;
                default -> ErrorCode.UPSTREAM_ERROR;
            };
            assertEquals(expected, assertThrows(ApiException.class,
                    () -> client.getOrderForReview(10L, 7L)).getCode());
            server.verify();
        }
        server.reset();
        server.expect(requestTo(url)).andRespond(withException(new IOException("Timeout")));
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> client.getOrderForReview(10L, 7L)).getCode());
        server.verify();
        server.reset();
        server.expect(requestTo(url)).andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertNull(client.getOrderForReview(10L, 7L));
        server.verify();
        server.reset();
        server.expect(requestTo(url)).andRespond(withStatus(HttpStatus.NO_CONTENT));
        assertEquals(ErrorCode.UPSTREAM_ERROR, assertThrows(ApiException.class,
                () -> client.getOrderForReview(10L, 7L)).getCode());
        server.verify();
    }

    @Test
    void rejectsInvalidOrderEvidenceBeforeWriting() {
        ReviewRepository repository = mock(ReviewRepository.class);
        OrderServiceClient orders = mock(OrderServiceClient.class);
        ReviewService service = new ReviewService(repository, orders,
                mock(ReviewReplyRepository.class), mock(ReviewAuditOutbox.class));
        for (OrderVerificationDto order : List.of(
                new OrderVerificationDto(10L, "ORD-10", 8L, "COMPLETED", List.of(20L)),
                new OrderVerificationDto(11L, "ORD-11", 7L, "COMPLETED", List.of(20L)),
                new OrderVerificationDto(10L, "ORD-10", 7L, "COMPLETED", null),
                new OrderVerificationDto(10L, "ORD-10", 7L, null, List.of(20L)))) {
            when(orders.getOrderForReview(10L, 7L)).thenReturn(order);
            assertEquals(ErrorCode.UPSTREAM_ERROR,
                    assertThrows(ApiException.class, () -> service.createReview(7L, request)).getCode());
        }
        for (OrderVerificationDto order : List.of(
                new OrderVerificationDto(10L, "ORD-10", 7L, "PENDING", List.of(20L)),
                new OrderVerificationDto(10L, "ORD-10", 7L, "COMPLETED", List.of()),
                new OrderVerificationDto(10L, "ORD-10", 7L, "COMPLETED", List.of(21L)))) {
            when(orders.getOrderForReview(10L, 7L)).thenReturn(order);
            assertThrows(IllegalArgumentException.class, () -> service.createReview(7L, request));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void createsVerifiedReviewAndRejectsDuplicates() {
        ReviewRepository repository = mock(ReviewRepository.class);
        OrderServiceClient orders = mock(OrderServiceClient.class);
        ReviewService service = new ReviewService(repository, orders,
                mock(ReviewReplyRepository.class), mock(ReviewAuditOutbox.class));
        when(orders.getOrderForReview(10L, 7L))
                .thenReturn(new OrderVerificationDto(10L, "ORD-10", 7L, "COMPLETED", List.of(20L)));
        when(repository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));
        assertEquals(7L, service.createReview(7L, request).customerId());
        when(repository.existsByCustomerIdAndOrderIdAndProductId(7L, 10L, 20L)).thenReturn(true);
        assertEquals(ErrorCode.RESOURCE_CONFLICT,
                assertThrows(ApiException.class, () -> service.createReview(7L, request)).getCode());
        verify(repository, times(1)).save(any(Review.class));
    }

    @Test
    void preservesOwnershipVisibilityAndLegacyMapping() {
        ReviewRepository repository = mock(ReviewRepository.class);
        ReviewService service = new ReviewService(repository, mock(OrderServiceClient.class),
                mock(ReviewReplyRepository.class), mock(ReviewAuditOutbox.class));
        Review review = new Review(7L, 20L, 10L, 5, "Great food");
        review.setId(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(review));
        assertThrows(ForbiddenException.class,
                () -> service.updateReview(1L, 8L, new UpdateReviewRequest(1, "Not mine")));
        assertThrows(ForbiddenException.class, () -> service.deleteReview(1L, 8L));
        when(repository.findByProductIdAndStatusOrderByCreatedAtDesc(20L, ReviewStatus.VISIBLE))
                .thenReturn(List.of(review));
        assertEquals(1L, service.getProductReviews(20L).totalReviews());
        verify(repository).findByProductIdAndStatusOrderByCreatedAtDesc(20L, ReviewStatus.VISIBLE);
        assertEquals("VISIBLE", DomainMapper.toResponse(review).status());
        assertEquals(review.getCreatedAt().toInstant(), DomainMapper.toResponse(review).createdAt());
        ReviewReply reply = new ReviewReply(review, 2L, "STAFF", "Thank you");
        assertEquals(1L, DomainMapper.toResponse(reply).reviewId());
    }

    private void authenticate(String role) {
        Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "HS256")
                .subject("7").claim("role", role).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class MethodSecurityConfig {
        @Bean
        ReviewService reviewService() { return mock(ReviewService.class); }

        @Bean
        ReviewController reviewController(ReviewService service) { return new ReviewController(service); }
    }
}
