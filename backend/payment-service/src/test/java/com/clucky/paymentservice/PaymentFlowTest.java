package com.clucky.paymentservice;

import com.clucky.paymentservice.mapper.EventMapper;
import com.clucky.paymentservice.service.PaymentFlow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.client.RestClient;
import static org.mockito.Mockito.*;

class PaymentFlowTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EventMapper events = mock(EventMapper.class);
    private final ResultSet row = mock(ResultSet.class);
    private final PaymentFlow service = new PaymentFlow(jdbc, mock(DiscoveryClient.class), RestClient.builder(), new ObjectMapper(), events, "test-key");

    @BeforeEach
    void setup() throws Exception {
        when(jdbc.queryForObject("SELECT order_id FROM payment_service.payments WHERE id=?",Long.class,7L)).thenReturn(10L);
        when(row.getLong("id")).thenReturn(7L); when(row.getLong("order_id")).thenReturn(10L);
        when(row.getBigDecimal("amount")).thenReturn(new BigDecimal("100000"));
        when(row.getBigDecimal("received_amount")).thenReturn(new BigDecimal("40000"));
        when(row.getString("status")).thenReturn("PENDING");
        when(row.getTimestamp("expires_at")).thenReturn(Timestamp.from(Instant.now().plusSeconds(600)));
        doAnswer(invocation -> {
            RowMapper<?> rows = invocation.getArgument(1);
            return List.of(rows.mapRow(row, 0));
        }).when(jdbc).query(anyString(), any(RowMapper.class), eq(7L));
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        when(events.toJson(any())).thenReturn("{}");
    }

    @Test
    void sumsAllocatedReceiptsAndProposesOnlyWhenFullyFunded() throws Exception {
        when(jdbc.queryForObject(anyString(), eq(BigDecimal.class), eq(7L))).thenReturn(new BigDecimal("60000"));
        service.reconcile(7L);
        verify(events, never()).toJson(any());
        when(jdbc.queryForObject(anyString(), eq(BigDecimal.class), eq(7L))).thenReturn(new BigDecimal("120000"));
        service.reconcile(7L);
        verify(events).toJson(argThat(event -> "payment.received".equals(event.eventType())
                && event.payload().path("amount").decimalValue().compareTo(new BigDecimal("100000")) == 0
                && event.payload().path("receivedAmount").decimalValue().compareTo(new BigDecimal("120000")) == 0));
        when(row.getBoolean("receipt_proposed")).thenReturn(true);
        service.reconcile(7L);
        verify(events, times(1)).toJson(any());
    }

    @Test
    void previouslyAllocatedMoneyCanResumeAfterCollectionRejection() throws Exception {
        when(row.getBigDecimal("received_amount")).thenReturn(new BigDecimal("100000"));
        when(jdbc.queryForObject(anyString(),eq(BigDecimal.class),eq(7L))).thenReturn(new BigDecimal("100000"));
        when(jdbc.update(startsWith("UPDATE payment_service.bank_transactions"),any(Object[].class))).thenReturn(0);
        service.reconcile(7L);
        verify(events).toJson(argThat(event -> "payment.received".equals(event.eventType())));
    }

    @Test
    void closedAndAlreadyPaidPaymentsKeepMoneyWithoutNewConfirmation() throws Exception {
        when(jdbc.queryForObject(anyString(), eq(BigDecimal.class), eq(7L))).thenReturn(new BigDecimal("120000"));
        when(row.getString("closed_reason")).thenReturn("CANCELLED");
        service.reconcile(7L);
        when(row.getString("closed_reason")).thenReturn(null);
        when(row.getTimestamp("expires_at")).thenReturn(Timestamp.from(Instant.now().minusSeconds(1)));
        service.reconcile(7L);
        when(row.getString("status")).thenReturn("PAID");
        service.reconcile(7L);
        verify(events, never()).toJson(any());
    }
}
