package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.ConfirmRefundRequest;
import com.clucky.paymentservice.dto.ReserveRefundRequest;
import com.clucky.paymentservice.entity.RefundReservation;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.clucky.paymentservice.repository.RefundReservationRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentRefundSafetyTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RefundReservationRepository reservations = mock(RefundReservationRepository.class);
    private final PaymentRefundService service = new PaymentRefundService(jdbc, reservations);

    private void receipts(BigDecimal received) {
        when(jdbc.queryForList(startsWith("SELECT id,amount,method,status"), eq(2L))).thenReturn(List.of(Map.of(
                "id", 1L, "amount", BigDecimal.valueOf(100), "method", "BANK_TRANSFER", "status", "PAID", "order_code", "CLU-2")));
        when(jdbc.queryForObject(contains("sum(receipt.amount)"), eq(BigDecimal.class), eq(2L), eq(2L), eq(2L), eq(2L))).thenReturn(received);
        when(reservations.findActiveByOrderId(2L)).thenReturn(List.of());
    }

    @Test
    void cachedPaidStatusWithoutVerifiedReceiptsIsNotMoney() {
        receipts(BigDecimal.ZERO);
        assertFalse(service.getEligibleRefund(2L, BigDecimal.valueOf(100)).eligible());
    }

    @Test
    void partialReceiptsAreDeferredAndExcessIsNeverRefundable() {
        receipts(BigDecimal.valueOf(99));
        assertFalse(service.getEligibleRefund(2L, BigDecimal.valueOf(100)).eligible());
        receipts(BigDecimal.valueOf(120));
        assertEquals(BigDecimal.valueOf(100), service.getEligibleRefund(2L, BigDecimal.valueOf(100)).refundableAmount());
        var held = new RefundReservation(); held.setAmount(BigDecimal.valueOf(100));
        when(reservations.findActiveByOrderId(2L)).thenReturn(List.of(held));
        assertFalse(service.getEligibleRefund(2L, BigDecimal.valueOf(100)).eligible());
    }

    @Test
    void releaseBeforeDelayedReservationPermanentlyFencesTheRequest() {
        service.releaseRefund(1L);
        verify(jdbc).update(startsWith("INSERT INTO payment_service.refund_releases"), eq(1L));
        when(jdbc.queryForObject(contains("refund_releases"), eq(Boolean.class), eq(1L))).thenReturn(true);
        assertEquals(ErrorCode.INVALID_REFUND_STATE, assertThrows(ApiException.class, () -> service.reserveRefund(
                new ReserveRefundRequest(1L, 2L, "CLU-2", BigDecimal.valueOf(100)))).getCode());
        verify(reservations, never()).saveAndFlush(any());
    }

    @Test
    void confirmedRetryMustMatchTheOriginalEvidenceAndAttempt() {
        var reservation = new RefundReservation(); reservation.setId(3L); reservation.setRefundRequestId(1L);
        reservation.setOrderId(2L); reservation.setAmount(BigDecimal.valueOf(100)); reservation.setStatus("CONFIRMED");
        when(reservations.findByRefundRequestId(1L)).thenReturn(Optional.of(reservation));
        String attempt = UUID.randomUUID().toString(); String evidence = "a".repeat(64);
        when(jdbc.queryForMap(startsWith("SELECT attempt_id,evidence_reference"), eq(3L)))
                .thenReturn(Map.of("attempt_id", attempt, "evidence_reference", evidence));
        assertDoesNotThrow(() -> service.confirmRefund(1L, new ConfirmRefundRequest(2L, BigDecimal.valueOf(100), attempt, evidence)));
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class, () -> service.confirmRefund(1L,
                new ConfirmRefundRequest(2L, BigDecimal.valueOf(100), UUID.randomUUID().toString(), evidence))).getCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void previouslyHeldReservationCannotBypassLostReceiptEligibility() {
        receipts(BigDecimal.ZERO);
        var held = new RefundReservation(); held.setRefundRequestId(1L); held.setOrderId(2L); held.setOrderCode("CLU-2");
        held.setAmount(BigDecimal.valueOf(100)); held.setStatus("HELD");
        when(reservations.findByRefundRequestId(1L)).thenReturn(Optional.of(held));
        when(reservations.findActiveByOrderId(2L)).thenReturn(List.of(held));
        assertEquals(ErrorCode.REFUND_AMOUNT_EXCEEDED, assertThrows(ApiException.class, () -> service.reserveRefund(
                new ReserveRefundRequest(1L, 2L, "CLU-2", BigDecimal.valueOf(100)))).getCode());
        verify(reservations, never()).saveAndFlush(any());
    }
}
