package com.clucky.paymentservice.service;

import com.clucky.paymentservice.exception.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentOperationsTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final PaymentFlow flow = mock(PaymentFlow.class);
    private final PaymentOperations service = new PaymentOperations(jdbc,new ObjectMapper().findAndRegisterModules(),flow);
    private final UUID collectionId = UUID.randomUUID();

    @AfterEach void clearActor() { SecurityContextHolder.clearContext(); }

    private void actor(String role,long store) {
        Jwt jwt=Jwt.withTokenValue("test").header("alg","HS256").subject("5").claim("role",role).claim("storeId",store).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,List.of()));
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L,"ORD-10",1L,2L,new BigDecimal("200000"),
                "CONFIRMED","COD","PENDING",null,Instant.parse("2026-11-10T00:00:00Z")));
    }

    @Test void validatesCashAndPreservesExplicitDiscrepancy() {
        PaymentOperations.validateCash(new BigDecimal("120000"),new BigDecimal("80000"),new BigDecimal("150000"),new BigDecimal("30000"));
        PaymentOperations.validateCash(BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO);
        assertThrows(ApiException.class,()->PaymentOperations.validateCash(BigDecimal.ONE,BigDecimal.ZERO,BigDecimal.ONE,BigDecimal.ONE));
        assertThrows(ApiException.class,()->PaymentOperations.validateCash(new BigDecimal("0.1"),BigDecimal.ZERO,BigDecimal.ONE,BigDecimal.ZERO));
    }

    @Test void customerAndForeignStoreCannotReadOperations() {
        actor("CUSTOMER",2L);
        assertThrows(AccessDeniedException.class,()->service.read(10L));
        verifyNoInteractions(jdbc);
        actor("STAFF",3L);
        assertThrows(AccessDeniedException.class,()->service.read(10L));
        verifyNoInteractions(jdbc);
    }

    @Test void counterQrUsesTheAssignedBankAndCanonicalOrderReference() {
        actor("STAFF", 2L);
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L, "CLU-20261112-W27G", null, 2L,
                new BigDecimal("10000"), "CONFIRMED", "CASH", "PENDING", null, Instant.now(), "COUNTER", "PICKUP"));
        when(jdbc.queryForList(startsWith("SELECT bank_name,bank_code,account_no,account_name FROM payment_service.store_bank_accounts"), eq(2L)))
                .thenReturn(List.of(Map.of("bank_name", "Configured Bank", "bank_code", "970422", "account_no", "00123456789", "account_name", "CLUCKY STORE")));
        var result = service.read(10L);
        assertEquals("CLU20261112W27G", result.path("reference").asText());
        assertEquals("00123456789", result.path("bankInfo").path("accountNo").asText());
        assertEquals("CLUCKY STORE", result.path("bankInfo").path("accountName").asText());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test void onlineQrKeepsThePaymentReferenceInsteadOfReplacingItWithTheOrderCode() {
        actor("STAFF", 2L);
        when(jdbc.queryForList(startsWith("SELECT bank_name,bank_code,account_no,account_name,transfer_content"), eq(10L)))
                .thenReturn(List.of(Map.of("bank_name", "Configured Bank", "bank_code", "970422", "account_no", "00123456789",
                        "account_name", "CLUCKY STORE", "transfer_content", "CLUCKY002X1234ABCDX")));
        assertEquals("CLUCKY002X1234ABCDX", service.read(10L).path("reference").asText());
    }

    @Test void missingBankConfigurationDoesNotInventTransferInstructions() {
        actor("STAFF", 2L);
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L, "ORD-10", null, 2L,
                new BigDecimal("10000"), "CONFIRMED", "CASH", "PENDING", null, Instant.now(), "COUNTER", "PICKUP"));
        var result = service.read(10L);
        assertFalse(result.has("bankInfo"));
        assertFalse(result.has("reference"));
    }

    @Test void pickupCodCanShowAndDeclareQrWhileCashStillRequiresEvidence() {
        actor("STAFF", 2L);
        Instant version = Instant.parse("2026-11-13T00:00:00Z");
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L, "ORD-10", 1L, 2L,
                new BigDecimal("200000"), "READY", "COD", "PENDING", null, version, "WEB", "PICKUP"));
        when(jdbc.queryForList(startsWith("SELECT bank_name,bank_code,account_no,account_name FROM payment_service.store_bank_accounts"), eq(2L)))
                .thenReturn(List.of(Map.of("bank_name", "Bank", "bank_code", "970422", "account_no", "123", "account_name", "STORE")));
        assertEquals("ORD10", service.read(10L).path("reference").asText());
        when(jdbc.queryForList(startsWith("SELECT id,order_id,status"), any(UUID.class))).thenReturn(List.of(collection()));
        when(jdbc.queryForObject(startsWith("SELECT coalesce(sum(amount)"), eq(BigDecimal.class), any(UUID.class))).thenReturn(BigDecimal.ZERO);
        assertDoesNotThrow(() -> service.collect(10L, new PaymentOperations.CollectionRequest(version, BigDecimal.ZERO,
                new BigDecimal("200000"), BigDecimal.ZERO, BigDecimal.ZERO, "Customer requested QR"), UUID.randomUUID()));
        verify(flow).enqueue(eq("payment.received"), eq(10L), argThat(payload -> payload.path("declaredTransfer").intValue() == 200000));
        assertThrows(ApiException.class, () -> service.collect(10L, new PaymentOperations.CollectionRequest(version, new BigDecimal("200000"),
                BigDecimal.ZERO, new BigDecimal("200000"), BigDecimal.ZERO, "Cash"), UUID.randomUUID()));
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L, "ORD-10", 1L, 2L,
                new BigDecimal("200000"), "READY", "COD", "PENDING", null, version, "WEB", "DELIVERY"));
        assertThrows(ApiException.class, () -> service.collect(10L, new PaymentOperations.CollectionRequest(version, BigDecimal.ZERO,
                new BigDecimal("200000"), BigDecimal.ZERO, BigDecimal.ZERO, "QR"), UUID.randomUUID()));
    }

    private Map<String,Object> collection() {
        return new HashMap<>(Map.ofEntries(Map.entry("id",collectionId),Map.entry("order_id",10L),Map.entry("order_code","ORD-10"),
                Map.entry("customer_id",1L),Map.entry("store_id",2L),Map.entry("version",0L),Map.entry("status","ACCEPTED"),
                Map.entry("amount",new BigDecimal("200000")),Map.entry("cash_amount",new BigDecimal("120000")),
                Map.entry("transfer_amount",new BigDecimal("80000")),Map.entry("account_no","123"),Map.entry("bank_code","TEST")));
    }

    @Test void staffCanAssignUnidentifiedReceiptFromSharedAccountToOwnPendingOrder() {
        var receipt = pendingReceipt();
        when(jdbc.queryForObject(startsWith("SELECT bank_store_ids"),eq(Boolean.class),eq(2L),eq(7L))).thenReturn(true);
        var request = new PaymentOperations.ReconcileRequest(7L,0L,20L,null,0L,"Checked customer receipt",false);
        assertTrue(service.assign(10L,request,UUID.randomUUID()).path("allocated").asBoolean());
        verify(flow).reconcile(20L);
        verify(jdbc).update(startsWith("UPDATE payment_service.bank_transactions SET assigned_by"),eq(5L),eq(request.reason()),eq(7L));
        receipt.put("version",1L);
        assertThrows(ApiException.class,()->service.assign(10L,request,UUID.randomUUID()));
    }

    @Test void assignmentRejectsForeignAccountSuggestionAndClosedOrder() {
        pendingReceipt();
        var request = new PaymentOperations.ReconcileRequest(7L,0L,20L,null,0L,"Checked receipt",false);
        assertThrows(AccessDeniedException.class,()->service.assign(10L,request,UUID.randomUUID()));
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L,"ORD-10",1L,2L,new BigDecimal("200000"),
                "CANCELLED","BANK_TRANSFER","PENDING",Instant.now().plusSeconds(600),Instant.now()));
        assertThrows(ApiException.class,()->service.assign(10L,request,UUID.randomUUID()));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }

    private Map<String,Object> pendingReceipt() {
        actor("STAFF",2L);
        Instant expires = Instant.now().plusSeconds(600);
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L,"ORD-10",1L,2L,new BigDecimal("200000"),
                "PENDING_PAYMENT","BANK_TRANSFER","PENDING",expires,Instant.now()));
        var payment = collection();
        payment.put("id",20L); payment.put("method","BANK_TRANSFER"); payment.put("status","PENDING");
        payment.put("live_payment",true); payment.put("expires_at",Timestamp.from(expires));
        var receipt = new HashMap<String,Object>(Map.ofEntries(Map.entry("version",0L),Map.entry("conflict_count",0L),
                Map.entry("webhook_fingerprint","original"),Map.entry("sub_account",""),Map.entry("transfer_direction","in"),
                Map.entry("bank_account","123"),Map.entry("bank_gateway","TEST"),Map.entry("reason","REFERENCE_NOT_FOUND")));
        when(jdbc.queryForList(startsWith("SELECT * FROM payment_service.payments"),eq(20L),eq(10L))).thenReturn(List.of(payment));
        when(jdbc.queryForList(startsWith("SELECT * FROM payment_service.bank_transactions"),eq(7L))).thenReturn(List.of(receipt));
        return receipt;
    }

    @Test void bankEvidenceReplacesPendingDeclarationWithoutIncreasingCollection() {
        actor("STAFF",2L);
        var target=collection();
        var receipt=new HashMap<String,Object>(Map.ofEntries(Map.entry("version",0L),Map.entry("conflict_count",0L),Map.entry("webhook_fingerprint","original"),
                Map.entry("sub_account",""),Map.entry("transfer_direction","in"),Map.entry("classified_store_id",2L),
                Map.entry("bank_account","123"),Map.entry("bank_gateway","TEST"),Map.entry("amount",new BigDecimal("80000"))));
        when(jdbc.queryForList(startsWith("SELECT * FROM payment_service.collections"),eq(collectionId),eq(10L))).thenReturn(List.of(target));
        when(jdbc.queryForList(startsWith("SELECT * FROM payment_service.bank_transactions"),eq(7L))).thenReturn(List.of(receipt));
        when(jdbc.queryForList(startsWith("SELECT id,order_id,status"),eq(collectionId))).thenReturn(List.of(target));
        when(jdbc.queryForObject(anyString(),eq(BigDecimal.class),eq(collectionId))).thenReturn(new BigDecimal("80000"));
        var request=new PaymentOperations.ReconcileRequest(7L,0L,null,collectionId,0L,"Verified bank evidence",false);
        var result=service.reconcile(10L,request,UUID.randomUUID()).path("collection");
        assertEquals(new BigDecimal("200000"),result.path("operationalReceived").decimalValue());
        assertEquals(0,result.path("pendingTransfer").decimalValue().signum());
        verify(jdbc,never()).update(startsWith("UPDATE payment_service.payments"),any(Object[].class));
        target.put("version",1L);
        assertThrows(ApiException.class,()->service.reconcile(10L,request,UUID.randomUUID()));
    }

    @Test void legacyMissingSnapshotIsNeverActivated() {
        actor("ADMIN",2L);
        when(flow.context(10L)).thenReturn(new PaymentFlow.Context(10L,"ORD-10",1L,2L,new BigDecimal("200000"),
                "PENDING_PAYMENT","BANK_TRANSFER","PENDING",Instant.now().plusSeconds(60),Instant.now()));
        var legacy=collection(); legacy.put("status","PENDING"); legacy.put("method","BANK_TRANSFER");
        when(jdbc.queryForList(startsWith("SELECT * FROM payment_service.payments"),eq(7L),eq(10L))).thenReturn(List.of(legacy));
        assertThrows(ApiException.class,()->service.adopt(10L,new PaymentOperations.LegacyRequest(7L,0L,"Review original snapshot"),UUID.randomUUID()));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }

    @Test void idempotentReplayChecksCurrentScopeAndRejectsChangedPayload() throws Exception {
        actor("STAFF",2L);
        UUID key=UUID.randomUUID();
        var mapper=new ObjectMapper().findAndRegisterModules();
        var request=new PaymentOperations.CollectionRequest(Instant.parse("2026-11-10T00:00:00Z"),BigDecimal.ZERO,
                new BigDecimal("200000"),BigDecimal.ZERO,BigDecimal.ZERO,"Reviewed declaration");
        String hash=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(("collect:10"+mapper.writeValueAsString(request)).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        when(jdbc.queryForList(startsWith("SELECT request_hash,response"),eq(5L),eq(key)))
                .thenReturn(List.of(Map.of("request_hash",hash,"response","{\"status\":\"PENDING\"}")));
        assertEquals("PENDING",service.collect(10L,request,key).path("status").asText());
        var changed=new PaymentOperations.CollectionRequest(request.orderVersion(),BigDecimal.ZERO,BigDecimal.ONE,BigDecimal.ZERO,BigDecimal.ZERO,request.reason());
        assertThrows(ApiException.class,()->service.collect(10L,changed,key));
        actor("STAFF",3L);
        assertThrows(AccessDeniedException.class,()->service.collect(10L,request,key));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
}
