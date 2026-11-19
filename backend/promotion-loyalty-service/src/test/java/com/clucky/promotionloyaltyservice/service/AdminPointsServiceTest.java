package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.AdminPointsData.AdjustmentRequest;
import com.clucky.promotionloyaltyservice.exception.ConflictException;
import com.clucky.promotionloyaltyservice.exception.ResourceNotFoundException;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AdminPointsServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final LoyaltyService loyalty = mock(LoyaltyService.class);
    private final VoucherAuditOutbox audit = mock(VoucherAuditOutbox.class);
    private final AdminCustomerProof proof = mock(AdminCustomerProof.class);
    private final AdminPointsService service = new AdminPointsService(jdbc, loyalty, audit, proof);

    @Test
    void rejectsUnknownCustomerBeforeCreatingAnyWallet() {
        doThrow(new ResourceNotFoundException("Unknown customer")).when(proof).verify(999999L);
        assertThrows(ResourceNotFoundException.class, () -> service.adjust(999999L, 99L,
                request(500, 0)));
        verifyNoInteractions(jdbc, audit);
    }

    @Test
    void cannotRemovePointsReservedForAnOrder() {
        when(jdbc.queryForMap(anyString(), eq(123L))).thenReturn(wallet(100, 80));
        assertThrows(ConflictException.class, () -> service.adjust(123, 99,
                request(60, 100)));
        verify(jdbc, never()).update(org.mockito.ArgumentMatchers.contains("UPDATE promotion_service.member_points"),
                org.mockito.ArgumentMatchers.<Object[]>any());
        verifyNoInteractions(audit);
    }

    @Test
    void staleTotalMustBeReloadedBeforeAdjustment() {
        when(jdbc.queryForMap(anyString(), eq(123L))).thenReturn(wallet(100, 20));
        assertThrows(ConflictException.class, () -> service.adjust(123, 99,
                request(110, 90)));
        verifyNoInteractions(audit);
    }

    private Map<String, Object> wallet(long total, long reserved) {
        return Map.of("id", 12L, "total_points", total,
                "reserved_points", reserved, "lifetime_points", 500L, "wallet_state", "ACTIVE");
    }

    private AdjustmentRequest request(long next, long expected) {
        return new AdjustmentRequest(next, expected, "Điều chỉnh hợp lệ", UUID.randomUUID());
    }
}
