package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.controller.VoucherController;
import com.clucky.promotionloyaltyservice.dto.*;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.model.*;
import com.clucky.promotionloyaltyservice.repository.VoucherRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.mockito.Mockito.*;

class VoucherProposalSafetyTest {
    private final VoucherRepository repository = mock(VoucherRepository.class);
    private final VoucherAuditOutbox audit = mock(VoucherAuditOutbox.class);
    private final VoucherStoreVerifier stores = mock(VoucherStoreVerifier.class);
    private final VoucherService service = new VoucherService(repository, audit, stores);

    @AfterEach void clearActor() { SecurityContextHolder.clearContext(); }

    private VoucherRequest request() {
        var request = new VoucherRequest();
        request.setCode("PROPOSAL");
        request.setType(VoucherType.AMOUNT);
        request.setValue(BigDecimal.TEN);
        request.setStartAt(Instant.now().minusSeconds(10));
        request.setEndAt(Instant.now().plusSeconds(3600));
        return request;
    }

    private void actor(String role, Long store) {
        var builder = Jwt.withTokenValue("test").header("alg", "HS256").subject("7").claim("role", role);
        if (store != null) builder.claim("storeId", store);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(), List.of()));
    }

    @Test
    void managementReadsRequireJwtRoleAndOwnStore() {
        var controller = new VoucherController(service);
        assertThrows(RuntimeException.class, () -> controller.getVouchers(null, null, null, null));
        actor("CUSTOMER", null);
        assertThrows(ApiException.class, () -> controller.getVouchers(null, null, null, null));
        actor("STORE_MANAGER", 2L);
        assertThrows(ApiException.class, () -> controller.getVouchers(null, 3L, null, null));
        controller.getVouchers(VoucherScope.ALL, null, null, null);
        verify(repository).findWithFilters(VoucherScope.STORE, 2L, null, null);
    }

    @Test
    void proposalsCannotCrossStoresOrSkipApproval() {
        var request = request();
        request.setStoreId(3L);
        assertThrows(ApiException.class, () -> service.createStoreProposal(request, 7L, "STORE_MANAGER", 2L));
        assertThrows(ApiException.class, () -> service.createVoucher(request, 7L, "STORE_MANAGER", 2L));
        request.setStoreId(2L);
        request.setStatus(VoucherStatus.ACTIVE);
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(repository.save(any())).thenAnswer(call -> {
            Voucher saved = call.getArgument(0);
            saved.setId(13L);
            return saved;
        });
        var response = service.createStoreProposal(request, 7L, "STORE_MANAGER", 2L);
        assertEquals(VoucherStatus.PENDING_APPROVAL, response.getStatus());
        assertEquals(VoucherScope.STORE, response.getScope());
        assertEquals(2L, response.getStoreId());
        verify(audit).record(eq(7L), eq("STORE_MANAGER"), eq(2L), eq("VOUCHER_PROPOSED"), eq("VOUCHER"), anyLong(), anyMap(), anyMap());
    }

    @Test
    void managerEditsInvalidateApprovalAndOtherRolesCannotMutate() {
        var voucher = new Voucher();
        voucher.setId(1L);
        voucher.setStoreId(2L);
        voucher.setScope(VoucherScope.STORE);
        voucher.setStatus(VoucherStatus.ACTIVE);
        voucher.setApprovedBy(1L);
        when(repository.findByIdWithLock(1L)).thenReturn(Optional.of(voucher));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        var request = request();
        request.setVersion(voucher.getVersion());
        request.setStatus(VoucherStatus.ACTIVE);
        request.setStoreId(3L);
        assertThrows(ApiException.class, () -> service.updateVoucher(1L, request, 7L, "STORE_MANAGER", 2L));
        request.setStoreId(2L);
        service.updateVoucher(1L, request, 7L, "STORE_MANAGER", 2L);
        assertEquals(VoucherStatus.PENDING_APPROVAL, voucher.getStatus());
        assertNull(voucher.getApprovedBy());
        assertThrows(ApiException.class, () -> service.updateVoucher(1L, request(), 7L, "CUSTOMER", null));
        assertThrows(ApiException.class, () -> service.deleteVoucher(1L, 7L, "STAFF", 2L));
        assertThrows(ApiException.class, () -> service.createVoucher(request(), 7L, null, null));
    }

    @Test
    void approvalRequiresAdminAndCannotReviveExpiredPendingProposal() {
        var voucher = new Voucher();
        voucher.setId(1L);
        voucher.setScope(VoucherScope.STORE);
        voucher.setStoreId(2L);
        voucher.setStatus(VoucherStatus.PENDING_APPROVAL);
        voucher.setStartAt(Instant.now().minusSeconds(3600));
        voucher.setEndAt(Instant.now().minusSeconds(60));
        when(repository.findByIdWithLock(1L)).thenReturn(Optional.of(voucher));
        assertThrows(ApiException.class, () -> service.approveVoucher(1L, 7L, "STORE_MANAGER"));
        assertThrows(ApiException.class, () -> service.approveVoucher(1L, 1L, "ADMIN"));
        voucher.setEndAt(Instant.now().plusSeconds(3600));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        service.approveVoucher(1L, 1L, "ADMIN");
        service.approveVoucher(1L, 9L, "ADMIN");
        assertEquals(1L, voucher.getApprovedBy());
        verify(repository, times(1)).save(voucher);
        verify(stores).requireExists(2L);
        verify(audit, times(1)).record(eq(1L), eq("ADMIN"), eq(2L), eq("VOUCHER_APPROVED"), eq("VOUCHER"), eq(1L), anyMap(), anyMap());
    }

    @Test
    void proposalCannotBypassApprovalByDisablingThenReactivating() {
        var voucher = new Voucher();
        voucher.setId(1L);
        voucher.setStatus(VoucherStatus.PENDING_APPROVAL);
        when(repository.findByIdWithLock(1L)).thenReturn(Optional.of(voucher));
        var request = request();
        request.setVersion(voucher.getVersion());
        for (VoucherStatus status : List.of(VoucherStatus.ACTIVE, VoucherStatus.DISABLED)) {
            request.setStatus(status);
            assertThrows(com.clucky.promotionloyaltyservice.exception.ConflictException.class,
                    () -> service.updateVoucher(1L, request, 1L, "ADMIN", null));
        }
        verify(repository, never()).save(any());
        verifyNoInteractions(audit);
    }

    @Test
    void validationAcceptsBothAmountFieldNames() throws Exception {
        var mapper = new ObjectMapper();
        for (String field : List.of("subtotal", "orderAmount")) {
            var request = mapper.readValue("{\"code\":\"PROMO\",\"" + field + "\":100000}", ValidateVoucherRequest.class);
            assertEquals(new BigDecimal("100000"), request.getOrderAmount());
        }
    }

    @Test
    void rejectionRequiresAdminReasonAndCurrentVersionAndPreservesBranchFeedback() {
        var voucher = new Voucher();
        voucher.setId(12L);
        voucher.setStoreId(2L);
        voucher.setScope(VoucherScope.STORE);
        voucher.setCreatedBy(7L);
        voucher.setStatus(VoucherStatus.PENDING_APPROVAL);
        voucher.setStartAt(Instant.now().minusSeconds(60));
        voucher.setEndAt(Instant.now().plusSeconds(3600));
        var request = new RejectVoucherRequest("  Giảm tối đa vượt ngân sách  ", voucher.getVersion());
        assertThrows(ApiException.class, () -> service.rejectVoucher(12L, request, 7L, "STORE_MANAGER"));
        for (String reason : List.of(" ", "x".repeat(501))) {
            assertThrows(com.clucky.promotionloyaltyservice.exception.BadRequestException.class,
                    () -> service.rejectVoucher(12L, new RejectVoucherRequest(reason, 0L), 1L, "ADMIN"));
        }
        verifyNoInteractions(repository, audit);
        when(repository.findByIdWithLock(12L)).thenReturn(Optional.of(voucher));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        assertThrows(com.clucky.promotionloyaltyservice.exception.ConflictException.class,
                () -> service.rejectVoucher(12L, new RejectVoucherRequest("Reason", 99L), 1L, "ADMIN"));
        var rejected = service.rejectVoucher(12L, request, 1L, "ADMIN");
        service.rejectVoucher(12L, request, 9L, "ADMIN");
        assertEquals(VoucherStatus.REJECTED, rejected.getStatus());
        assertEquals("Giảm tối đa vượt ngân sách", rejected.getRejectionReason());
        assertEquals(1L, rejected.getRejectedBy());
        assertNotNull(rejected.getRejectedAt());
        assertEquals(2L, rejected.getStoreId());
        assertEquals(7L, rejected.getCreatedBy());
        verify(repository, times(1)).save(voucher);
        verify(audit, times(1)).record(eq(1L), eq("ADMIN"), eq(2L), eq("VOUCHER_REJECTED"), eq("VOUCHER"), eq(12L), anyMap(), anyMap());
        assertThrows(com.clucky.promotionloyaltyservice.exception.ConflictException.class,
                () -> service.rejectVoucher(12L, new RejectVoucherRequest("Changed reason", 0L), 1L, "ADMIN"));
        assertThrows(RuntimeException.class, () -> service.approveVoucher(12L, 1L, "ADMIN"));
        assertThrows(com.clucky.promotionloyaltyservice.exception.ConflictException.class,
                () -> service.deleteVoucher(12L, 1L, "ADMIN", null));
        when(repository.findById(12L)).thenReturn(Optional.of(voucher));
        var controller = new VoucherController(service);
        actor("STORE_MANAGER", 2L);
        assertEquals(rejected.getRejectionReason(), controller.getVoucherById(12L).getBody().getRejectionReason());
        actor("STORE_MANAGER", 3L);
        assertThrows(ApiException.class, () -> controller.getVoucherById(12L));
    }

    @Test
    void approvedVouchersCannotBeRejectedAndPendingHistoryCannotBeDeleted() {
        var voucher = new Voucher();
        voucher.setId(12L);
        voucher.setScope(VoucherScope.STORE);
        voucher.setStatus(VoucherStatus.ACTIVE);
        when(repository.findByIdWithLock(12L)).thenReturn(Optional.of(voucher));
        assertThrows(com.clucky.promotionloyaltyservice.exception.ConflictException.class,
                () -> service.rejectVoucher(12L, new RejectVoucherRequest("Reason", 0L), 1L, "ADMIN"));
        voucher.setStatus(VoucherStatus.PENDING_APPROVAL);
        assertThrows(com.clucky.promotionloyaltyservice.exception.ConflictException.class,
                () -> service.deleteVoucher(12L, 1L, "ADMIN", null));
        verify(repository, never()).save(any());
        verify(repository, never()).delete(any(Voucher.class));
        verifyNoInteractions(audit);
    }
}
