package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.dto.CreateRefundRequest;
import com.clucky.cartorderservice.dto.Role;
import com.clucky.cartorderservice.dto.ReviewRefundRequest;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.entity.RefundRequest;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.media.RefundEvidenceService;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.OrderStatusHistoryRepository;
import com.clucky.cartorderservice.repository.RefundAttemptRepository;
import com.clucky.cartorderservice.repository.RefundRequestRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RefundRoleGuardsTest {
    private final RefundRequestRepository refundRepo = mock(RefundRequestRepository.class);
    private final OrderRepository orderRepo = mock(OrderRepository.class);
    private final OrderStatusHistoryRepository historyRepo = mock(OrderStatusHistoryRepository.class);
    private final PaymentClient paymentClient = mock(PaymentClient.class);
    private final RefundRequestService service = new RefundRequestService(
            refundRepo, mock(RefundAttemptRepository.class), orderRepo, historyRepo,
            new AccessGuard(), paymentClient, mock(RefundEvidenceService.class),
            mock(OrderEventPublisher.class), new com.fasterxml.jackson.databind.ObjectMapper(), mock(CustomerProfileClient.class));

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    private void actor(String role, Long storeId) {
        var builder = Jwt.withTokenValue("test").header("alg", "HS256").subject("1").claim("role", role);
        if (storeId != null) builder.claim("storeId", storeId);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(), List.of()));
    }

    private Order order(Long customerId, Long storeId, String status) {
        Order order = new Order();
        order.setId(1L);
        order.setCustomerId(customerId);
        order.setStoreId(storeId);
        order.setStatus(status);
        order.setTotalAmount(BigDecimal.valueOf(100000));
        order.setPaymentMethod("BANK_TRANSFER");
        when(orderRepo.lockById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepo.save(order)).thenReturn(order);
        return order;
    }

    private RefundRequest refund(Order order, String status) {
        RefundRequest refund = new RefundRequest();
        refund.setId(1L);
        refund.setOrderId(order.getId());
        refund.setCustomerId(order.getCustomerId());
        refund.setStatus(status);
        refund.setAmount(order.getTotalAmount());
        refund.setBankAccountNo("123");
        when(refundRepo.findById(1L)).thenReturn(Optional.of(refund));
        when(refundRepo.lockById(1L)).thenReturn(Optional.of(refund));
        when(refundRepo.save(any())).thenReturn(refund);
        return refund;
    }

    @Test
    void administratorsAndManagersCannotCreateRefundOnBehalfOfCustomer() {
        for (String role : List.of("ADMIN", "STORE_MANAGER")) {
            actor(role, 10L);
            var request = new CreateRefundRequest(1L, "Customer request", null, null, null);
            assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class, () -> service.createRefundRequest(request)).getCode());
        }
        verifyNoInteractions(orderRepo, refundRepo, historyRepo, paymentClient);
    }

    @Test
    void customerCannotCreateRefundForAnotherCustomer() {
        actor("CUSTOMER", null);
        order(2L, 10L, "CANCELLED");
        var request = new CreateRefundRequest(1L, "Customer request", null, null, null);
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> service.createRefundRequest(request));
        verifyNoInteractions(refundRepo, historyRepo, paymentClient);
    }

    @Test
    void staffCannotCreateRefund() {
        actor("STAFF", 10L);
        order(1L, 10L, "CANCELLED");
        var history = new OrderStatusHistory();
        history.setFromStatus("CONFIRMED");
        history.setToStatus("CANCELLED");
        history.setChangedRole("CUSTOMER");
        when(historyRepo.findByOrderIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(history));

        var req = new CreateRefundRequest(1L, "test", null, null, null);
        assertThrows(ApiException.class, () -> service.createRefundRequest(req));
    }

    @Test
    void shipperCannotCreateRefund() {
        actor("SHIPPER", null);
        order(1L, 10L, "CANCELLED");
        var req = new CreateRefundRequest(1L, "test", null, null, null);
        assertThrows(ApiException.class, () -> service.createRefundRequest(req));
    }

    @Test
    void internalServiceCannotCreateRefund() {
        actor("INTERNAL_SERVICE", null);
        order(1L, 10L, "CANCELLED");
        var req = new CreateRefundRequest(1L, "test", null, null, null);
        assertThrows(ApiException.class, () -> service.createRefundRequest(req));
    }

    @Test
    void staffCannotApproveRefund() {
        actor("STAFF", 10L);
        Order order = order(1L, 10L, "CANCELLED");
        refund(order, "PENDING");
        assertThrows(ApiException.class, () -> service.approveRefundRequest(1L, null));
    }

    @Test
    void staffCannotConfirmRefund() {
        actor("STAFF", 10L);
        Order order = order(1L, 10L, "CANCELLED");
        RefundRequest refund = refund(order, "PROCESSING");
        refund.setEvidencePublicId("test");
        assertThrows(ApiException.class, () -> service.confirmRefund(1L));
    }

    @Test
    void managerCanApproveOwnStoreRefund() {
        actor("STORE_MANAGER", 10L);
        Order order = order(1L, 10L, "CANCELLED");
        var refund = refund(order, "PENDING");
        cancellation();
        var response = service.approveRefundRequest(1L, new ReviewRefundRequest("ok", null));
        assertEquals("PENDING", response.status());
        assertEquals("RESERVE", response.paymentOperation());
        assertEquals("STORE_MANAGER", refund.getReviewRole());
        verifyNoInteractions(paymentClient);
    }

    private void cancellation() {
        var cancelled = new OrderStatusHistory();
        cancelled.setFromStatus("CONFIRMED"); cancelled.setToStatus("CANCELLED");
        cancelled.setChangedRole("CUSTOMER"); cancelled.setChangedBy(1L); cancelled.setReason("Customer cancellation");
        when(historyRepo.findByOrderIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(cancelled));
    }

    @Test
    void reservationTimeoutKeepsRecoverableIntentAndDoesNotApprove() {
        actor("ADMIN", null);
        var order = order(1L, 10L, "CANCELLED");
        var refund = refund(order, "PENDING"); cancellation();
        service.approveRefundRequest(1L, null);
        when(paymentClient.reserveRefund(any(), any(), any(), any()))
                .thenThrow(new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE))
                .thenReturn(new PaymentClient.ReserveRefundResponse(5L, 1L, 1L, order.getTotalAmount(), "HELD"));
        var failure = assertThrows(ApiException.class, () -> service.recoverPayment(1L));
        service.deferPayment(1L, failure);
        assertEquals("PENDING", refund.getStatus());
        assertEquals("RESERVE", refund.getPaymentOperation());
        assertEquals("DEPENDENCY_UNAVAILABLE", refund.getPaymentError());
        service.recoverPayment(1L);
        assertEquals("APPROVED", refund.getStatus());
        assertNull(refund.getPaymentOperation());
        service.recoverPayment(1L);
        verify(paymentClient, times(2)).reserveRefund(any(), any(), any(), any());
    }

    @Test
    void rejectReplacesPendingApprovalWithDurableRelease() {
        actor("ADMIN", null);
        var order = order(1L, 10L, "CANCELLED");
        var refund = refund(order, "PENDING"); cancellation();
        service.approveRefundRequest(1L, null);
        var response = service.rejectRefundRequest(1L, new ReviewRefundRequest("Not eligible", null));
        assertEquals("REJECTED", response.status()); assertEquals("RELEASE", response.paymentOperation());
        verifyNoInteractions(paymentClient);
        service.recoverPayment(1L);
        verify(paymentClient).releaseRefund(1L);
        verify(paymentClient, never()).reserveRefund(any(), any(), any(), any());
        assertNull(refund.getPaymentOperation());
    }

    @Test
    void managerCannotUseAdminCustomerFilter() {
        actor("STORE_MANAGER", 10L);
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class, () -> service.getRefundRequests(
                1L, 10L, null, null, org.springframework.data.domain.PageRequest.of(0, 20))).getCode());
        verifyNoInteractions(refundRepo);
    }

    @Test
    void preIntentCrashHoldIsReleasedWithoutInventingApproval() {
        actor("ADMIN", null);
        var order = order(1L, 10L, "CANCELLED");
        var refund = refund(order, "PENDING"); cancellation();
        when(paymentClient.reservation(1L)).thenReturn(new PaymentClient.ReserveRefundResponse(5L, 1L, 1L, order.getTotalAmount(), "HELD"));
        service.recoverUntrackedReservation(1L);
        assertEquals("RELEASE", refund.getPaymentOperation());
        assertEquals("PENDING", refund.getStatus());
        service.recoverPayment(1L);
        verify(paymentClient).releaseRefund(1L);
        assertNull(refund.getPaymentOperation());
        assertEquals("INVALID_REFUND_STATE", refund.getPaymentError());
        assertEquals(ErrorCode.INVALID_REFUND_STATE, assertThrows(ApiException.class, () -> service.approveRefundRequest(1L, null)).getCode());
    }

    @Test
    void duplicateCreationReturnsTheStoredLogicalRequestWithoutAnotherHold() {
        actor("CUSTOMER", null);
        var order = order(1L, 10L, "CANCELLED");
        order.setCustomerEmailVerified(true);
        var refund = refund(order, "PENDING"); cancellation();
        when(refundRepo.findAllByOrderId(1L)).thenReturn(List.of(refund));
        var result = service.createRefundRequest(new CreateRefundRequest(1L, "Cancellation", null, null, null));
        assertFalse(result.created());
        assertEquals(1L, result.refund().id());
        verifyNoInteractions(paymentClient);
        verify(refundRepo, never()).saveAndFlush(any());
    }

    @Test
    void customerSubmittingBankDetailsUpdatesAutoCreatedRefund() {
        actor("CUSTOMER", 100L);
        Order order = order(1L, 10L, "CANCELLED");
        order.setCustomerEmailVerified(true);
        var refund = refund(order, "WAITING_BANK_DETAILS");
        refund.setBankAccountNo(null);
        refund.setBankBin(null);
        cancellation();
        when(refundRepo.findAllByOrderId(1L)).thenReturn(List.of(refund));
        when(refundRepo.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var request = new CreateRefundRequest(1L, "Reason", "970422", "MBBank", "0924517780", "NDQN");
        var result = service.createRefundRequest(request);

        assertTrue(result.created());
        assertEquals("970422", result.refund().bankBin());
        assertEquals("0924517780", result.refund().bankAccountNo());
        assertEquals("NDQN", result.refund().bankAccountName());
        assertEquals("APPROVED", result.refund().status());
        verify(refundRepo).saveAndFlush(refund);
    }

    @Test
    void automaticRefundCreatesRefundInWaitingBankDetailsState() {
        Order order = order(1L, 10L, "CANCELLED");
        cancellation();
        when(orderRepo.lockById(1L)).thenReturn(Optional.of(order));
        when(refundRepo.findAllByOrderId(1L)).thenReturn(List.of());
        when(paymentClient.getEligibleRefund(eq(1L), any())).thenReturn(
                new com.clucky.cartorderservice.service.PaymentClient.EligibleRefundResponse(
                        true, new java.math.BigDecimal("100000"), new java.math.BigDecimal("100000"),
                        java.math.BigDecimal.ZERO, new java.math.BigDecimal("100000"), "PAID"
                )
        );
        when(refundRepo.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        boolean created = service.automaticRefund(1L);

        assertTrue(created);
        var captor = org.mockito.ArgumentCaptor.forClass(RefundRequest.class);
        verify(refundRepo).saveAndFlush(captor.capture());
        assertEquals("WAITING_BANK_DETAILS", captor.getValue().getStatus());
    }

    @Test
    void managerCannotApproveOtherStoreRefund() {
        actor("STORE_MANAGER", 20L);
        Order order = order(1L, 10L, "CANCELLED");
        refund(order, "PENDING");
        assertThrows(Exception.class, () -> service.approveRefundRequest(1L, null));
    }

    @Test
    void adminBankEditsRequireTheVersionShownInTheForm() {
        actor("ADMIN", null);
        var order = order(1L, 10L, "CANCELLED");
        var refund = refund(order, "PENDING");
        refund.setBankDetailsVersion(2);
        assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class, () -> service.updateBankDetails(1L,
                new com.clucky.cartorderservice.dto.UpdateBankDetailsRequest("970436", "Bank", "123", "Owner", null))).getCode());
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class, () -> service.updateBankDetails(1L,
                new com.clucky.cartorderservice.dto.UpdateBankDetailsRequest("970436", "Bank", "123", "Owner", 1))).getCode());
        assertEquals(2, refund.getBankDetailsVersion());
        verifyNoInteractions(paymentClient);
    }
}
