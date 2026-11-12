package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.SepayReceipt;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReceiptRecoveryAndScopeTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final SepayReceiptService service = new SepayReceiptService(jdbc, mapper);

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    @Test
    void intakeClassifiesStoreFromContentWithoutBankAssignment() {
        when(jdbc.queryForList(startsWith("INSERT INTO payment_service.bank_transactions"), eq(Long.class), any(Object[].class))).thenReturn(List.of(7L));
        when(jdbc.queryForMap(startsWith("SELECT * FROM payment_service.bank_transactions"), any(Object[].class))).thenReturn(receipt());
        assertTrue(service.receive(input()));
        Object[] change = classification();
        assertEquals("UNMATCHED", change[0]);
        assertEquals("ORDER_REFERENCE_NOT_FOUND", change[1]);
        assertNull(change[2]);
        assertEquals(1L, change[4]);
        assertTrue(change[5].toString().contains("TRANSFER_CONTENT"));
        assertFalse(change[5].toString().contains("001234"));
    }

    @Test
    void earlyReceiptFindsNewSnapshotWithoutReadingCurrentBankAssignment() {
        recover(receipt(), List.of(candidate(1)));
        service.recover();
        Object[] change = classification();
        assertEquals("PENDING_RECONCILIATION", change[0]);
        assertEquals(100L, change[2]);
        assertEquals(1L, change[4]);
        assertTrue(change[5].toString().contains("PAYMENT_SNAPSHOT"));
        verify(jdbc, never()).queryForList(startsWith("SELECT account.id"), any(Object[].class));
        verify(jdbc, never()).update(startsWith("UPDATE payment_service.payments"), any(Object[].class));
    }

    @Test
    void recoveryPreservesIntakeClassificationWithoutUsingNewAssignments() {
        Map<String, Object> receipt = receipt();
        receipt.put("classified_store_id", 1L);
        recover(receipt, List.of());
        service.recover();
        Object[] change = classification();
        assertEquals("UNMATCHED", change[0]);
        assertEquals(1L, change[4]);
        assertTrue(change[5].toString().contains("TRANSFER_CONTENT"));
        verify(jdbc, never()).queryForList(startsWith("SELECT account.id"), any(Object[].class));
    }

    @Test
    void newForeignOrderEvidenceRevokesStoreOnlyVisibility() {
        Map<String, Object> receipt = receipt();
        receipt.put("classified_store_id", 1L);
        recover(receipt, List.of(candidate(2)));
        service.recover();
        Object[] change = classification();
        assertEquals("STORE_ORDER_CONFLICT", change[1]);
        assertNull(change[2]);
        assertNull(change[4]);
    }

    @Test
    void virtualOrUnknownSubAccountsNeverBecomePaymentCandidates() {
        for (String subAccount : new String[]{null, "VA1"}) {
            Map<String, Object> receipt = receipt();
            receipt.put("sub_account", subAccount);
            recover(receipt, List.of(candidate(1)));
            service.recover();
        }
        ArgumentCaptor<Object[]> changes = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc, times(2)).update(startsWith("UPDATE payment_service.bank_transactions SET status=?,reason=?"), changes.capture());
        for (Object[] change : changes.getAllValues()) {
            assertEquals("SUB_ACCOUNT_REVIEW", change[1]);
            assertNull(change[2]);
            assertNull(change[4]);
        }
    }

    @Test
    void recoveryIsBoundedFairAndDatabaseFailureIsNotSwallowed() {
        recover(receipt(), List.of(candidate(1)));
        doThrow(new DataAccessResourceFailureException("Unavailable")).when(jdbc)
                .update(startsWith("UPDATE payment_service.bank_transactions SET status=?,reason=?"), any(Object[].class));
        assertThrows(DataAccessResourceFailureException.class, service::recover);
        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForList(query.capture());
        assertTrue(query.getValue().contains("ORDER BY recheck_after,id LIMIT 50 FOR UPDATE SKIP LOCKED"));
        assertTrue(query.getValue().contains("sub_account=''"));
        assertTrue(query.getValue().contains("webhook_fingerprint IS NOT NULL"));
        assertTrue(query.getValue().contains("conflict_count=0"));
    }

    @Test
    void onlyFingerprintVerifiedReplayRestoresMissingEvidence() throws Exception {
        Map<String, Object> stored = receipt();
        stored.put("webhook_fingerprint", null);
        when(jdbc.queryForMap(startsWith("SELECT * FROM payment_service.bank_transactions"), any(Object[].class))).thenReturn(stored);
        assertTrue(service.receive(input()));
        verify(jdbc, never()).update(startsWith("UPDATE payment_service.bank_transactions SET sub_account"), any(Object[].class));
        var financial = mapper.createObjectNode().put("id", 77L).put("accountNumber", "001234")
                .put("gateway", "VIETCOMBANK").put("content", input().content()).put("transferType", "in")
                .put("transferAmount", input().transferAmount()).put("transactionDate", input().transactionDate().toString()).put("subAccount", "");
        stored.put("webhook_fingerprint", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(mapper.writeValueAsString(financial).getBytes(StandardCharsets.UTF_8))));
        assertTrue(service.receive(input()));
        verify(jdbc).update(startsWith("UPDATE payment_service.bank_transactions SET sub_account"), eq(""), eq(7L));
    }

    @Test
    void staffScopeAppliesToSearchCountAndLastReceivedAt() {
        actor("STAFF", 1L);
        when(jdbc.queryForObject(startsWith("SELECT count(*)"), eq(Long.class), any(Object[].class))).thenReturn(0L);
        service.list(null, "token", null, null, null, false, 0, 20);
        ArgumentCaptor<String> count = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).queryForObject(count.capture(), eq(Long.class), arguments.capture());
        assertTrue(count.getValue().contains("receipt.conflict_count=0"));
        assertTrue(count.getValue().contains("receipt.transfer_direction='in'"));
        assertTrue(count.getValue().contains("coalesce(receipt.classified_store_id"));
        assertTrue(count.getValue().contains("receipt.bank_store_ids @> ARRAY[?]"));
        assertTrue(count.getValue().contains("receipt.reason='REFERENCE_NOT_FOUND'"));
        assertArrayEquals(new Object[]{1L, 1L, "token"}, arguments.getValue());
        verify(jdbc).queryForObject(contains("receipt.conflict_count=0"), eq(Timestamp.class), eq(1L), eq(1L));
        verify(jdbc).query(contains("receipt.conflict_count=0"), ArgumentMatchers.<RowMapper<SepayReceiptService.Entry>>any(), eq(1L), eq(1L), eq("token"), eq(20), eq(0L));
    }

    @Test
    void wrongRolesAndStoreOverridesCannotReadLedger() {
        for (String role : new String[]{"CUSTOMER", "SHIPPER"}) {
            actor(role, 1L);
            assertThrows(AccessDeniedException.class, () -> service.list(null, null, null, null, null, false, 0, 20));
            assertThrows(AccessDeniedException.class, () -> service.get(7));
        }
        actor("STAFF", null);
        assertThrows(AccessDeniedException.class, () -> service.get(7));
        actor("STORE_MANAGER", 1L);
        assertThrows(AccessDeniedException.class, () -> service.list(null, null, 2L, null, null, false, 0, 20));
        verifyNoInteractions(jdbc);
    }

    @Test
    void detailIsScopedAndForeignOrMissingReceiptReturnsNotFound() {
        actor("STORE_MANAGER", 2L);
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, assertThrows(ApiException.class, () -> service.get(777)).getCode());
        verify(jdbc).query(contains("receipt.conflict_count=0"), ArgumentMatchers.<RowMapper<SepayReceiptService.Entry>>any(), eq(2L), eq(2L), eq(777L));
    }

    @Test
    void adminRetainsUnclassifiedAndConflictInbox() {
        actor("ADMIN", null);
        when(jdbc.queryForObject(startsWith("SELECT count(*)"), eq(Long.class), any(Object[].class))).thenReturn(0L);
        service.list("UNMATCHED", null, null, null, null, true, 0, 20);
        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(query.capture(), eq(Long.class), any(Object[].class));
        assertTrue(query.getValue().contains("receipt.conflict_count>0"));
        assertFalse(query.getValue().contains("receipt.conflict_count=0"));
        assertFalse(query.getValue().contains("classified_store_id"));
    }

    private void recover(Map<String, Object> receipt, List<TransferReference.Candidate> candidates) {
        when(jdbc.queryForList(startsWith("SELECT * FROM payment_service.bank_transactions WHERE status"))).thenReturn(List.of(receipt));
        when(jdbc.query(startsWith("SELECT id,order_code"), ArgumentMatchers.<RowMapper<TransferReference.Candidate>>any())).thenReturn(candidates);
    }

    @Test
    void sharedReceivingAccountIsOnlyASuggestionNotAClassifiedStore() {
        var receipt = receipt(); receipt.put("content", "Customer transfer");
        when(jdbc.queryForList(startsWith("INSERT INTO payment_service.bank_transactions"), eq(Long.class), any(Object[].class))).thenReturn(List.of(7L));
        when(jdbc.queryForMap(startsWith("SELECT * FROM payment_service.bank_transactions"), any(Object[].class))).thenReturn(receipt);
        when(jdbc.queryForList(startsWith("SELECT DISTINCT assignment.store_id"), eq(Long.class), any(Object[].class))).thenReturn(List.of(1L, 2L));
        assertTrue(service.receive(input()));
        assertNull(classification()[4]);
        verify(jdbc).update(startsWith("UPDATE payment_service.bank_transactions SET bank_store_ids"), eq("1,2"), eq(7L));
    }

    @Test
    void branchFilterDoesNotUseAccountSuggestions() {
        actor("ADMIN", null);
        when(jdbc.queryForObject(startsWith("SELECT count(*)"), eq(Long.class), any(Object[].class))).thenReturn(0L);
        service.list(null, null, 2L, null, null, false, 0, 20, false, "VCB");
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(Long.class), any(Object[].class));
        assertTrue(sql.getValue().contains("coalesce(receipt.classified_store_id"));
        assertFalse(sql.getValue().contains("bank_store_ids"));
        assertTrue(sql.getValue().contains("receipt.bank_gateway"));
    }

    @Test
    void counterReceiptLinksScopedEvidenceWithoutAddingAnotherCollection() {
        var transaction = receipt();
        transaction.put("content", "Payment ORDER-100");
        transaction.put("bank_tx_id", "SEPAY:77");
        recover(transaction, List.of());
        var collectionId = java.util.UUID.randomUUID();
        Map<String, Object> counter = Map.of("id", 12L, "collection_id", collectionId, "store_id", 1L,
                "order_code", "ORDER-100", "receipt_code", "REC-ORDER-100", "bank_amount_declared", new BigDecimal("50000"),
                "bank_name", "Vietcombank", "bank_code", "VCB");
        when(jdbc.queryForList(startsWith("SELECT bank_tx.*"), eq(7L))).thenReturn(List.of(transaction));
        when(jdbc.queryForList(startsWith("SELECT receipt.id,receipt.receipt_code"), eq(7L))).thenReturn(List.of(counter));
        when(jdbc.queryForList(startsWith("SELECT id FROM payment_service.counter_payment_receipts"), eq(Long.class), eq(12L))).thenReturn(List.of(12L));
        when(jdbc.update(startsWith("UPDATE payment_service.bank_transactions SET collection_id="), any(Object[].class))).thenReturn(1);
        when(jdbc.update(startsWith("UPDATE payment_service.counter_payment_receipts SET bank_tx_id="), any(Object[].class))).thenReturn(1);
        service.recover();
        ArgumentCaptor<String> scope = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(2)).queryForList(scope.capture(), eq(7L));
        String intakeScope = scope.getAllValues().stream().filter(sql -> sql.startsWith("SELECT bank_tx.*")).findFirst().orElseThrow();
        assertTrue(intakeScope.contains("sub_account=''"));
        assertTrue(intakeScope.contains("conflict_count=0"));
        verify(jdbc).queryForList(contains("receipt.store_id=ANY(bank_tx.bank_store_ids)"), eq(7L));
        verify(jdbc).update(startsWith("UPDATE payment_service.counter_payment_receipts SET bank_tx_id="),
                eq("SEPAY:77"), eq(new BigDecimal("50000")), eq("RECONCILED"), eq(BigDecimal.ZERO), eq(12L));
        verify(jdbc, never()).update(startsWith("INSERT INTO payment_service.collections"), any(Object[].class));
    }

    private Object[] classification() {
        ArgumentCaptor<Object[]> changes = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(startsWith("UPDATE payment_service.bank_transactions SET status=?,reason=?"), changes.capture());
        return changes.getValue();
    }

    private Map<String, Object> receipt() {
        return new HashMap<>(Map.of("id", 7L, "content", "CLUCKY001XDEADBEEFX", "bank_account", "001234", "bank_gateway", "Vietcombank",
                "sub_account", "", "transfer_direction", "in", "amount", new BigDecimal("50000"), "webhook_fingerprint", "stored-fingerprint"));
    }

    private TransferReference.Candidate candidate(long storeId) {
        return new TransferReference.Candidate(100, "ORDER-100", storeId, "CLUCKY" + String.format("%03d", storeId) + "XDEADBEEFX",
                "001234", "Vietcombank", "VCB");
    }

    private SepayReceipt input() {
        return new SepayReceipt(77, "Vietcombank", "001234", "CLUCKY001XDEADBEEFX", "in", new BigDecimal("50000"),
                Instant.parse("2026-11-10T01:00:00Z"), "", "", "");
    }

    private void actor(String role, Long storeId) {
        var builder = Jwt.withTokenValue("fixture").header("alg", "HS256").subject("10").claim("role", role);
        if (storeId != null) builder.claim("storeId", storeId);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(), List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
