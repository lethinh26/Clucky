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
    private final VoucherService service = new VoucherService(repository);

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
        var response = service.createStoreProposal(request, 7L, "STORE_MANAGER", 2L);
        assertEquals(VoucherStatus.PENDING_APPROVAL, response.getStatus());
        assertEquals(VoucherScope.STORE, response.getScope());
        assertEquals(2L, response.getStoreId());
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
    }

    @Test
    void validationAcceptsBothAmountFieldNames() throws Exception {
        var mapper = new ObjectMapper();
        for (String field : List.of("subtotal", "orderAmount")) {
            var request = mapper.readValue("{\"code\":\"PROMO\",\"" + field + "\":100000}", ValidateVoucherRequest.class);
            assertEquals(new BigDecimal("100000"), request.getOrderAmount());
        }
    }
}
