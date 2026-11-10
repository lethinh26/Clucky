package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.SepayReceipt;
import com.clucky.paymentservice.exception.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SepayReceiptTest {
    private final TransferReference.Candidate candidate = new TransferReference.Candidate(
            1, "ORDER-123", 1L, "CLUCKY-001-123", "001234", "Vietcombank", "VCB");

    @Test
    void shortReferencesPreserveBranchAndDoNotMatchOldUuidPrefixes() {
        String reference = TransferReference.create(1);
        assertEquals(19, reference.length());
        assertTrue(reference.matches("CLUCKY001X[0-9A-F]{8}X"));
        assertTrue(TransferReference.create(1000).matches("CLUCKY1000X[0-9A-F]{8}X"));
        assertThrows(IllegalArgumentException.class, () -> TransferReference.create(0));
        assertThrows(IllegalArgumentException.class, () -> TransferReference.create(-1));
        var firstBranch = new TransferReference.Candidate(1, "ORDER-1", 1L, reference, "001234", "Vietcombank", "VCB");
        var secondBranch = new TransferReference.Candidate(2, "ORDER-2", 2L,
                reference.replace("CLUCKY001", "CLUCKY002"), "001234", "Vietcombank", "VCB");
        String legacyReference = reference.substring(0, reference.length() - 1) + "A".repeat(24);
        var legacy = new TransferReference.Candidate(3, "ORDER-3", 1L, legacyReference, "001234", "Vietcombank", "VCB");
        var candidates = List.of(firstBranch, secondBranch, legacy);
        assertEquals(firstBranch, TransferReference.find("Đã chuyển " + reference.toLowerCase(Locale.ROOT) + " thanh toán",
                "001234", "Vietcombank", "", candidates).candidate());
        assertEquals(secondBranch, TransferReference.find(secondBranch.reference(), "001234", "Vietcombank", "", candidates).candidate());
        assertEquals(legacy, TransferReference.find(legacyReference, "001234", "Vietcombank", "", candidates).candidate());
        assertNull(TransferReference.find(reference.substring(0, reference.length() - 1), "001234", "Vietcombank", "", candidates).candidate());
        assertEquals("AMBIGUOUS_REFERENCE", TransferReference.find(reference + " " + secondBranch.reference(),
                "001234", "Vietcombank", "", candidates).reason());
    }

    @Test
    void containsMatchesEmbeddedNormalizedReferenceButNotStoreAlone() {
        var match = TransferReference.find("Đã chuyển clucky 001-123 thanh toán", "001234", "Vietcombank", "", List.of(candidate));
        assertEquals(candidate, match.candidate());
        assertEquals("AWAITING_RECONCILIATION", match.reason());
        assertNull(TransferReference.find("chuyen 001", "001234", "Vietcombank", "", List.of(candidate)).candidate());
        assertEquals("DACHUYENCLUCKY001123THANHTOAN", TransferReference.normalize("Đã chuyển clucky 001-123 thanh toán"));
        assertEquals("CLUCKY1000123", TransferReference.normalize("CLUCKY-1000-123"));
    }

    @Test
    void ambiguousPrefixesWrongBankAndMissingSnapshotsNeverProduceCandidate() {
        var longer = new TransferReference.Candidate(2, "ORDER-1234", 2L, "CLUCKY-001-1234", "other", "Other", "OTHER");
        assertEquals("AMBIGUOUS_REFERENCE", TransferReference.find("CLUCKY0011234", "001234", "Vietcombank", "", List.of(candidate, longer)).reason());
        assertEquals("BANK_ACCOUNT_MISMATCH", TransferReference.find("CLUCKY001123", "1234", "Vietcombank", "", List.of(candidate)).reason());
        assertEquals("BANK_ACCOUNT_MISMATCH", TransferReference.find("CLUCKY001123", "001234", "OtherBank", "", List.of(candidate)).reason());
        assertEquals("SUB_ACCOUNT_REVIEW", TransferReference.find("CLUCKY001123", "001234", "Vietcombank", "VA1", List.of(candidate)).reason());
        var empty = new TransferReference.Candidate(3, "old", null, "---", null, null, null);
        assertEquals("REFERENCE_NOT_FOUND", TransferReference.find("CLUCKY", "001234", "Vietcombank", "", List.of(empty)).reason());
    }

    @Test
    void validatesProviderTypesAndVietnamTimeWithoutUsingBalanceAsAmount() {
        ObjectNode body = body();
        body.put("accumulated", 999999999);
        SepayReceipt receipt = SepayReceipt.parse(body);
        assertEquals("001234", receipt.accountNumber());
        assertEquals(50000, receipt.transferAmount().intValueExact());
        assertEquals(Instant.parse("2026-11-09T03:00:00Z"), receipt.transactionDate());
        assertEquals("", receipt.code());
        assertEquals("SepayReceipt[redacted]", receipt.toString());
        assertThrows(ApiException.class, () -> SepayReceipt.parse(body().put("transferAmount", "50000")));
        assertThrows(ApiException.class, () -> SepayReceipt.parse(body().put("transferAmount", 50000.5)));
        assertThrows(ApiException.class, () -> SepayReceipt.parse(body().put("transferAmount", 0)));
        assertThrows(ApiException.class, () -> SepayReceipt.parse(body().put("transferAmount", 1000000000000L)));
        assertThrows(ApiException.class, () -> SepayReceipt.parse(body().put("transactionDate", "2026-02-30 10:00:00")));
        assertThrows(ApiException.class, () -> SepayReceipt.parse(body().put("accountNumber", 1234)));
        assertThrows(ApiException.class, () -> SepayReceipt.parse(body().put("id", -1)));
    }

    private ObjectNode body() {
        return new ObjectMapper().createObjectNode().put("id", 100).put("gateway", "Vietcombank")
                .put("accountNumber", "001234").put("content", "CLUCKY-001-123")
                .put("transferType", "in").put("transferAmount", 50000).put("transactionDate", "2026-11-09 10:00:00")
                .put("subAccount", "").put("referenceCode", "").putNull("code");
    }

    @Test
    void storeHintRequiresOneCanonicalReferenceAndRejectsForeignOrderTokens() {
        var otherStore = new TransferReference.Candidate(2, "ORDER-2", 2L, "CLUCKY002XABCDEF12X", "001234", "Vietcombank", "VCB");
        assertEquals(1L, TransferReference.storeHint("Da chuyen CLUCKY-001-X-DEADBEEF-X cam on", List.of(otherStore)).storeId());
        assertEquals(1000L, TransferReference.storeHint("CLUCKY1000XDEADBEEFX", List.of(otherStore)).storeId());
        assertEquals("STORE_ORDER_CONFLICT", TransferReference.storeHint("CLUCKY001XABCDEF12X", List.of(otherStore)).reason());
        for (String text : List.of("amount 001", "CLUCKY001", "CLUCKY0001XDEADBEEFX", "CLUCKY000XDEADBEEFX",
                "CLUCKY9999999999999999999XDEADBEEFX", "CLUCKY001XDEADBEEFX CLUCKY002XFFFFFFFFX",
                "CLUCKY001XDEADBEEFX CLUCKY001XFFFFFFFFX", "CLUCKY001XDEADBEEFX CLUCKY002XINVALID")) {
            assertNull(TransferReference.storeHint(text, List.of(otherStore)).storeId());
        }
        assertNull(TransferReference.find("CLUCKY002XABCDEF12X CLUCKY001XDEADBEEFX", "001234", "Vietcombank", "", List.of(otherStore)).candidate());
        assertNull(TransferReference.find("CLUCKY002XABCDEF12X CLUCKY001XINVALID", "001234", "Vietcombank", "", List.of(otherStore)).candidate());
    }
}
