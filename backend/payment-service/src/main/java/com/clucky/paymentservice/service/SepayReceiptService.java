package com.clucky.paymentservice.service;

import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.PageResponse;
import com.clucky.paymentservice.dto.Role;
import com.clucky.paymentservice.dto.SepayReceipt;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SepayReceiptService {
    private static final String CLASSIFIED_STORE = "coalesce(receipt.classified_store_id,CASE WHEN receipt.payment_id IS NOT NULL "
            + "AND receipt.webhook_fingerprint IS NOT NULL THEN receipt.store_id END)";
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public SepayReceiptService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Transactional
    public boolean receive(SepayReceipt input) {
        String transactionId = "SEPAY:" + input.id();
        var financial = mapper.createObjectNode().put("id", input.id()).put("accountNumber", input.accountNumber())
                .put("gateway", TransferReference.normalize(input.gateway())).put("content", input.content())
                .put("transferType", input.transferType()).put("transferAmount", input.transferAmount())
                .put("transactionDate", input.transactionDate().toString()).put("subAccount", input.subAccount());
        String payload = json(financial);
        String fingerprint = fingerprint(payload);
        List<Long> inserted = jdbc.queryForList("INSERT INTO payment_service.bank_transactions "
                + "(bank_tx_id,bank_account,amount,content,bank_gateway,transfer_direction,received_at,bank_occurred_at,"
                + "webhook_fingerprint,sub_account,raw_payload,last_seen_at,status,reason) VALUES (?,?,?,?,?,?,now(),?,?,?,jsonb_build_object('referenceCode',?::text),now(),'UNMATCHED','REFERENCE_NOT_FOUND') "
                + "ON CONFLICT(bank_tx_id) DO NOTHING RETURNING id", Long.class, transactionId, input.accountNumber(),
                input.transferAmount(), input.content(), input.gateway(), input.transferType(), Timestamp.from(input.transactionDate()), fingerprint, input.subAccount(), input.referenceCode());
        if (inserted.isEmpty()) {
            var stored = jdbc.queryForMap("SELECT * FROM payment_service.bank_transactions WHERE bank_tx_id=? FOR UPDATE", transactionId);
            boolean same = stored.get("webhook_fingerprint") == null
                    ? Objects.equals(stored.get("bank_account"), input.accountNumber())
                        && stored.get("amount") instanceof BigDecimal amount && amount.compareTo(input.transferAmount()) == 0
                        && Objects.equals(stored.get("content"), input.content())
                        && Objects.equals(stored.get("transfer_direction"), input.transferType())
                        && TransferReference.normalize((String) stored.get("bank_gateway")).equals(TransferReference.normalize(input.gateway()))
                        && input.subAccount().isBlank()
                    : fingerprint.equals(stored.get("webhook_fingerprint"));
            if (same) {
                jdbc.update("UPDATE payment_service.bank_transactions SET replay_count=replay_count+1,last_seen_at=now() WHERE id=?", stored.get("id"));
                if (fingerprint.equals(stored.get("webhook_fingerprint"))) {
                    jdbc.update("UPDATE payment_service.bank_transactions SET sub_account=coalesce(sub_account,?),recheck_after=now() WHERE id=?",
                            input.subAccount(), stored.get("id"));
                }
                return true;
            }
            jdbc.update("INSERT INTO payment_service.sepay_receipt_conflicts(bank_transaction_id,fingerprint,financial_payload,reason) "
                    + "VALUES (?,?,?::jsonb,'DUPLICATE_CONTENT_MISMATCH') ON CONFLICT(bank_transaction_id,fingerprint) DO UPDATE "
                    + "SET occurrences=sepay_receipt_conflicts.occurrences+1,last_seen_at=now()", stored.get("id"), fingerprint, payload);
            jdbc.update("UPDATE payment_service.bank_transactions SET conflict_count=conflict_count+1,conflict_reviewed=false,last_seen_at=now(),classified_store_id=NULL WHERE id=?", stored.get("id"));
            return false;
        }
        long receiptId = inserted.getFirst();
        if ("out".equals(input.transferType())) {
            jdbc.update("UPDATE payment_service.bank_transactions SET status='IGNORED',reason='OUTGOING' WHERE id=?", receiptId);
        } else {
            classify(jdbc.queryForMap("SELECT * FROM payment_service.bank_transactions WHERE id=? FOR UPDATE", receiptId), candidates(), true);
            reconcileCounterReceipt(receiptId);
        }
        jdbc.update("INSERT INTO payment_service.webhook_logs(provider,signature_valid,payload,processed) "
                + "VALUES ('SEPAY',true,jsonb_build_object('transactionId',?::text,'authentication','API_KEY','stage','RECEIPT_STORED'),true)", transactionId);
        return true;
    }

    @Transactional
    public void recover() {
        var receipts = jdbc.queryForList("SELECT * FROM payment_service.bank_transactions WHERE status='UNMATCHED' AND payment_id IS NULL "
                + "AND collection_id IS NULL AND webhook_fingerprint IS NOT NULL AND sub_account='' AND conflict_count=0 AND transfer_direction='in' "
                + "AND recheck_after<=now() ORDER BY recheck_after,id LIMIT 50 FOR UPDATE SKIP LOCKED");
        if (receipts.isEmpty()) return;
        var candidates = candidates();
        for (var receipt : receipts) {
            classify(receipt, candidates, false);
            reconcileCounterReceipt(((Number) receipt.get("id")).longValue());
        }
    }

    private void reconcileCounterReceipt(long bankTransactionId) {
        var transactions = jdbc.queryForList(
                "SELECT bank_tx.*,bank_tx.raw_payload->>'referenceCode' AS reference_code "
                        + "FROM payment_service.bank_transactions bank_tx WHERE bank_tx.id=? "
                        + "AND status='UNMATCHED' AND reason='REFERENCE_NOT_FOUND' AND sub_account='' "
                        + "AND transfer_direction='in' AND payment_id IS NULL AND collection_id IS NULL "
                        + "AND candidate_payment_id IS NULL AND webhook_fingerprint IS NOT NULL AND conflict_count=0 FOR UPDATE", bankTransactionId);
        if (transactions.isEmpty()) return;
        Map<String, Object> transaction = transactions.getFirst();

        List<Map<String, Object>> candidates = jdbc.queryForList(
                "SELECT receipt.id,receipt.receipt_code,receipt.order_code,receipt.store_id,receipt.bank_ref_code,"
                        + "receipt.bank_amount_declared,receipt.collection_id,collection.bank_name,collection.bank_code,collection.account_no "
                        + "FROM payment_service.counter_payment_receipts receipt "
                        + "JOIN payment_service.collections collection ON collection.id=receipt.collection_id "
                        + "JOIN payment_service.bank_transactions bank_tx ON bank_tx.id=? "
                        + "WHERE receipt.status='PENDING_RECONCILIATION' AND receipt.bank_tx_id IS NULL "
                        + "AND receipt.collection_status='ACCEPTED' AND collection.status='ACCEPTED' "
                        + "AND bank_tx.status IN ('UNMATCHED','PENDING_RECONCILIATION') "
                        + "AND bank_tx.payment_id IS NULL AND bank_tx.collection_id IS NULL "
                        + "AND bank_tx.candidate_payment_id IS NULL AND bank_tx.webhook_fingerprint IS NOT NULL "
                        + "AND bank_tx.conflict_count=0 AND bank_tx.transfer_direction='in' "
                        + "AND bank_tx.bank_account=collection.account_no "
                        + "AND receipt.store_id=ANY(bank_tx.bank_store_ids)", bankTransactionId);
        String gateway = TransferReference.normalize((String) transaction.get("bank_gateway"));
        String content = upper((String) transaction.get("content"));
        String referenceCode = upper((String) transaction.get("reference_code"));
        List<Map<String, Object>> matches = candidates.stream()
                .filter(candidate -> gatewayMatches(gateway, candidate)
                        && hasCounterReference(content, referenceCode, candidate))
                .toList();
        if (matches.size() != 1) return;

        Map<String, Object> match = matches.getFirst();
        if (jdbc.queryForList("SELECT id FROM payment_service.counter_payment_receipts WHERE id=? "
                + "AND status='PENDING_RECONCILIATION' AND collection_status='ACCEPTED' AND bank_tx_id IS NULL FOR UPDATE", Long.class, match.get("id")).isEmpty()) return;
        UUID collectionId = (UUID) match.get("collection_id");
        int allocated = jdbc.update("UPDATE payment_service.bank_transactions SET collection_id=?,store_id=?,classified_store_id=?,"
                        + "matched_order_code=?,status='MATCHED',reason='COLLECTION_EVIDENCE' WHERE id=? AND payment_id IS NULL "
                        + "AND collection_id IS NULL AND candidate_payment_id IS NULL AND conflict_count=0",
                collectionId, match.get("store_id"), match.get("store_id"), match.get("order_code"), bankTransactionId);
        if (allocated != 1) return;

        BigDecimal declared = (BigDecimal) match.get("bank_amount_declared");
        BigDecimal received = (BigDecimal) transaction.get("amount");
        String status = declared.compareTo(received) == 0 ? "RECONCILED" : "DISCREPANCY";
        if (jdbc.update("UPDATE payment_service.counter_payment_receipts SET bank_tx_id=?,bank_amount_reconciled=?,status=?,"
                        + "discrepancy_amount=?,version=version+1,updated_at=now() WHERE id=? AND status='PENDING_RECONCILIATION' AND bank_tx_id IS NULL",
                transaction.get("bank_tx_id"), received, status, received.subtract(declared), match.get("id")) != 1) {
            throw new IllegalStateException("Counter receipt changed during allocation");
        }
        jdbc.update("UPDATE payment_service.collections SET version=version+1 WHERE id=?", collectionId);
    }

    private static boolean gatewayMatches(String gateway, Map<String, Object> candidate) {
        return !gateway.isBlank() && (gateway.equals(TransferReference.normalize((String) candidate.get("bank_name")))
                || gateway.equals(TransferReference.normalize((String) candidate.get("bank_code"))));
    }

    private static boolean hasCounterReference(String content, String referenceCode, Map<String, Object> candidate) {
        return containsReference(content, (String) candidate.get("order_code"))
                || containsReference(referenceCode, (String) candidate.get("order_code"))
                || containsReference(content, (String) candidate.get("receipt_code"))
                || containsReference(referenceCode, (String) candidate.get("receipt_code"))
                || containsReference(content, (String) candidate.get("bank_ref_code"))
                || containsReference(referenceCode, (String) candidate.get("bank_ref_code"));
    }

    private static String upper(String value) { return value == null ? "" : value.toUpperCase(Locale.ROOT); }

    private static boolean containsReference(String text, String reference) {
        if (reference == null || reference.isBlank()) return false;
        return java.util.regex.Pattern.compile("(?<![A-Z0-9])" + java.util.regex.Pattern.quote(upper(reference)) + "(?![A-Z0-9])")
                .matcher(text).find();
    }

    private List<TransferReference.Candidate> candidates() {
        return jdbc.query("SELECT id,order_code,store_id,transfer_content,account_no,bank_name,bank_code "
                + "FROM payment_service.payments WHERE method='BANK_TRANSFER' AND transfer_content IS NOT NULL",
                (row, index) -> new TransferReference.Candidate(row.getLong("id"), row.getString("order_code"),
                        row.getObject("store_id", Long.class), row.getString("transfer_content"), row.getString("account_no"),
                        row.getString("bank_name"), row.getString("bank_code")));
    }

    private void classify(Map<String, Object> receipt, List<TransferReference.Candidate> candidates, boolean initial) {
        String content = (String) receipt.get("content");
        String gateway = TransferReference.normalize((String) receipt.get("bank_gateway"));
        var match = TransferReference.find(content, (String) receipt.get("bank_account"), gateway, (String) receipt.get("sub_account"), candidates);
        var candidate = match.candidate();
        String reason = match.reason();
        Long storeId = null;
        String evidence = null;
        if (!"".equals(receipt.get("sub_account"))) {
            candidate = null;
            reason = "SUB_ACCOUNT_REVIEW";
        } else if (candidate != null) {
            storeId = candidate.storeId();
            evidence = json(mapper.createObjectNode().put("source", "PAYMENT_SNAPSHOT").put("paymentId", candidate.paymentId()));
        } else if ("REFERENCE_NOT_FOUND".equals(reason)) {
            var hint = TransferReference.storeHint(content, candidates);
            reason = hint.reason();
            if (hint.storeId() != null) {
                storeId = hint.storeId();
                evidence = json(mapper.createObjectNode().put("source", "TRANSFER_CONTENT").put("classifiedAt", Instant.now().toString()));
            }
        }
        if (initial) {
            List<Long> stores = jdbc.queryForList("SELECT DISTINCT assignment.store_id FROM payment_service.store_bank_accounts assignment "
                    + "JOIN payment_service.bank_accounts_config bank ON bank.id=assignment.bank_account_id "
                    + "WHERE bank.account_no=? AND bank.is_active AND ?<>'' AND ? IN "
                    + "(regexp_replace(upper(bank.bank_name),'[^A-Z0-9]','','g'),regexp_replace(upper(bank.bank_code),'[^A-Z0-9]','','g')) ORDER BY assignment.store_id",
                    Long.class, receipt.get("bank_account"), gateway, gateway);
            jdbc.update("UPDATE payment_service.bank_transactions SET bank_store_ids=string_to_array(?,',')::bigint[],bank_scope_source='RECEIVED_SNAPSHOT' WHERE id=?",
                    stores.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(",")), receipt.get("id"));
        }
        jdbc.update("UPDATE payment_service.bank_transactions SET status=?,reason=?,candidate_payment_id=?,candidate_order_code=?,"
                        + "classified_store_id=?,classification_evidence=coalesce(?::jsonb,classification_evidence),recheck_after=now()+interval '2 seconds' "
                        + "WHERE id=? AND payment_id IS NULL AND collection_id IS NULL AND conflict_count=0",
                candidate == null ? "UNMATCHED" : "PENDING_RECONCILIATION", reason, candidate == null ? null : candidate.paymentId(),
                candidate == null ? null : candidate.orderCode(), storeId, evidence, receipt.get("id"));
    }

    public record Entry(String id, String transactionId, BigDecimal amount, String direction, String bank,
            String maskedAccount, String content, Instant receivedAt, Instant bankOccurredAt, String status,
            String reason, Long storeId, String matchedOrderCode, String candidateOrderCode, long replayCount, long conflictCount, String classification, long version,
            List<Long> bankStoreIds, String bankScopeSource, boolean canAssign, Long assignedBy, Instant assignedAt, String assignmentReason) {}
    public record Inbox(PageResponse<Entry> page, Instant lastReceivedAt) {}
    public record Conflict(BigDecimal amount, String bank, String maskedAccount, String content, String direction,
            String bankTime, boolean sameAccount, boolean subAccount, Instant lastSeenAt, long occurrences) {}

    @Transactional(readOnly = true)
    public List<Conflict> conflicts(long receiptId, int page) {
        if (CurrentActor.require().role() != Role.ADMIN) throw new AccessDeniedException("Admin required");
        if (receiptId <= 0 || page < 0 || page > 1000000) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        get(receiptId);
        return jdbc.query("SELECT (conflict.financial_payload->>'transferAmount')::numeric AS amount,conflict.financial_payload->>'gateway' AS bank,"
                + "'****'||right(conflict.financial_payload->>'accountNumber',4) AS account,conflict.financial_payload->>'content' AS content,"
                + "conflict.financial_payload->>'transferType' AS direction,conflict.financial_payload->>'transactionDate' AS bank_time,"
                + "(conflict.financial_payload->>'accountNumber')=receipt.bank_account AS same_account,"
                + "coalesce(conflict.financial_payload->>'subAccount','')<>'' AS sub_account,conflict.last_seen_at,conflict.occurrences "
                + "FROM payment_service.sepay_receipt_conflicts conflict JOIN payment_service.bank_transactions receipt ON receipt.id=conflict.bank_transaction_id "
                + "WHERE receipt.id=? ORDER BY conflict.last_seen_at DESC,conflict.fingerprint LIMIT 20 OFFSET ?",
                (row,index)->new Conflict(row.getBigDecimal("amount"),row.getString("bank"),row.getString("account"),row.getString("content"),
                        row.getString("direction"),row.getString("bank_time"),row.getBoolean("same_account"),row.getBoolean("sub_account"),
                        row.getTimestamp("last_seen_at").toInstant(),row.getLong("occurrences")),receiptId,page*20);
    }

    private static final RowMapper<Entry> ENTRY = (row, index) -> {
        String account = row.getString("bank_account");
        Timestamp occurred = row.getTimestamp("bank_occurred_at");
        Long storeId = row.getObject("display_store_id", Long.class);
        String classification = row.getLong("conflict_count") > 0 || storeId == null ? "UNCLASSIFIED"
                : row.getObject("payment_id") != null || row.getObject("collection_id") != null ? "ALLOCATED" : row.getObject("candidate_payment_id") != null ? "PAYMENT_CANDIDATE" : "STORE_ONLY";
        Timestamp assigned = row.getTimestamp("assigned_at");
        boolean canAssign = row.getLong("conflict_count") == 0 && "in".equals(row.getString("transfer_direction"))
                && "".equals(row.getString("sub_account")) && row.getString("webhook_fingerprint") != null
                && row.getObject("payment_id") == null && row.getObject("collection_id") == null
                && Set.of("UNMATCHED", "PENDING_RECONCILIATION").contains(row.getString("status"))
                && !Set.of("STORE_ORDER_CONFLICT", "STORE_REFERENCE_CONFLICT", "AMBIGUOUS_REFERENCE").contains(String.valueOf(row.getString("reason")));
        return new Entry(Long.toString(row.getLong("id")), row.getString("bank_tx_id"), row.getBigDecimal("amount"),
                row.getString("transfer_direction"), row.getString("bank_gateway"),
                account == null ? "" : "****" + account.substring(Math.max(0, account.length() - 4)),
                row.getString("content"), row.getTimestamp("received_at").toInstant(), occurred == null ? null : occurred.toInstant(),
                row.getString("status"), row.getString("reason"), storeId, row.getString("matched_order_code"),
                row.getString("candidate_order_code"), row.getLong("replay_count"), row.getLong("conflict_count"), classification, row.getLong("version"),
                Arrays.asList((Long[]) row.getArray("bank_store_ids").getArray()), row.getString("bank_scope_source"), canAssign,
                row.getObject("assigned_by", Long.class), assigned == null ? null : assigned.toInstant(), row.getString("assignment_reason"));
    };

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Inbox list(String status, String search, Long storeId, Instant from, Instant to, boolean conflictsOnly, int page, int size) {
        return list(status, search, storeId, from, to, conflictsOnly, page, size, false, null);
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Inbox list(String status, String search, Long storeId, Instant from, Instant to, boolean conflictsOnly, int page, int size, boolean unclassifiedOnly, String bank) {
        if (page < 0 || page > 1000000 || size < 1 || size > 100) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (from != null && to != null && from.isAfter(to)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        List<Object> parameters = new ArrayList<>();
        String scope = scope(storeId, parameters);
        List<Object> scopeParameters = new ArrayList<>(parameters);
        StringBuilder where = new StringBuilder(scope);
        if (unclassifiedOnly) where.append(" AND " + CLASSIFIED_STORE + " IS NULL AND receipt.transfer_direction='in'");
        if (bank != null && !bank.isBlank()) {
            if (bank.length() > 100) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            where.append(" AND position(lower(?) in lower(receipt.bank_gateway))>0"); parameters.add(bank.strip());
        }
        if (status != null && !status.isBlank()) {
            if (!Set.of("UNMATCHED", "PENDING_RECONCILIATION", "MATCHED", "LATE_RECEIPT", "IGNORED").contains(status)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            where.append(" AND receipt.status=?"); parameters.add(status);
        }
        if (search != null && !search.isBlank()) {
            where.append(" AND position(lower(?) in lower(concat_ws(' ',receipt.bank_tx_id,receipt.content,receipt.matched_order_code,receipt.candidate_order_code))) > 0");
            parameters.add(search.strip());
        }
        if (from != null) { where.append(" AND receipt.received_at>=?"); parameters.add(Timestamp.from(from)); }
        if (to != null) { where.append(" AND receipt.received_at<=?"); parameters.add(Timestamp.from(to)); }
        if (conflictsOnly) where.append(" AND receipt.conflict_count>0");
        String source = " FROM payment_service.bank_transactions receipt";
        long total = jdbc.queryForObject("SELECT count(*)" + source + where, Long.class, parameters.toArray());
        parameters.add(size); parameters.add((long) page * size);
        List<Entry> entries = jdbc.query("SELECT receipt.*," + CLASSIFIED_STORE + " AS display_store_id" + source + where
                + " ORDER BY receipt.received_at DESC,receipt.id DESC LIMIT ? OFFSET ?", ENTRY, parameters.toArray());
        Timestamp last = jdbc.queryForObject("SELECT max(receipt.last_seen_at)" + source + scope, Timestamp.class, scopeParameters.toArray());
        return new Inbox(new PageResponse<>(entries, page, size, total, (int) Math.min(Integer.MAX_VALUE, (total + size - 1) / size)),
                last == null ? null : last.toInstant());
    }

    @Transactional(readOnly = true)
    public Entry get(long receiptId) {
        if (receiptId <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        List<Object> parameters = new ArrayList<>();
        String scope = scope(null, parameters);
        parameters.add(receiptId);
        return jdbc.query("SELECT receipt.*," + CLASSIFIED_STORE + " AS display_store_id FROM payment_service.bank_transactions receipt"
                        + scope + " AND receipt.id=?", ENTRY, parameters.toArray()).stream().findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private String scope(Long requestedStore, List<Object> parameters) {
        CurrentActor actor = CurrentActor.require();
        if (requestedStore != null && requestedStore <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String where = " WHERE 1=1";
        if (actor.role() != Role.ADMIN) {
            if ((actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER) || actor.storeId() == null || actor.storeId() <= 0
                    || requestedStore != null && !actor.storeId().equals(requestedStore)) throw new AccessDeniedException("Access denied");
            where += " AND receipt.conflict_count=0 AND receipt.transfer_direction='in' AND (" + CLASSIFIED_STORE + "=? OR ("
                    + CLASSIFIED_STORE + " IS NULL AND receipt.webhook_fingerprint IS NOT NULL AND receipt.sub_account='' "
                    + "AND receipt.reason='REFERENCE_NOT_FOUND' AND receipt.bank_store_ids @> ARRAY[?]::bigint[]))";
            parameters.add(actor.storeId()); parameters.add(actor.storeId());
        }
        if (requestedStore != null) {
            where += " AND " + CLASSIFIED_STORE + "=?";
            parameters.add(requestedStore);
        }
        return where;
    }

    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot serialize receipt"); }
    }

    private String fingerprint(String payload) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException failure) { throw new IllegalStateException(failure); }
    }
}
