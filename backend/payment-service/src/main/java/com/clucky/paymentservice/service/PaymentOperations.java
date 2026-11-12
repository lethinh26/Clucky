package com.clucky.paymentservice.service;

import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.DomainEvent;
import com.clucky.paymentservice.dto.Role;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentOperations {
    public record CollectionRequest(@NotNull Instant orderVersion,
            @NotNull @DecimalMin("0") @Digits(integer=12,fraction=0) BigDecimal cashAmount,
            @NotNull @DecimalMin("0") @Digits(integer=12,fraction=0) BigDecimal transferAmount,
            @NotNull @DecimalMin("0") @Digits(integer=12,fraction=0) BigDecimal cashTendered,
            @NotNull @DecimalMin("0") @Digits(integer=12,fraction=0) BigDecimal cashChange,
            @NotBlank @Size(max=500) @Pattern(regexp="[^\\x00]*") String reason) {}
    public record ReconcileRequest(@Positive @NotNull Long receiptId, @PositiveOrZero @NotNull Long receiptVersion,
            @Positive Long paymentId, UUID collectionId, @PositiveOrZero @NotNull Long targetVersion,
            @NotBlank @Size(max=500) @Pattern(regexp="[^\\x00]*") String reason, boolean acceptOriginalConflict) {}
    public record LegacyRequest(@Positive @NotNull Long paymentId, @PositiveOrZero @NotNull Long version,
            @NotBlank @Size(max=500) @Pattern(regexp="[^\\x00]*") String reason) {}
    public record CodEvidenceImage(String mimeType, byte[] bytes) {}
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final PaymentFlow flow;
    public PaymentOperations(JdbcTemplate jdbc, ObjectMapper mapper, PaymentFlow flow) { this.jdbc=jdbc; this.mapper=mapper; this.flow=flow; }

    @Transactional(readOnly=true)
    public ObjectNode read(long orderId) {
        CurrentActor actor = staff();
        var order = flow.context(orderId);
        scope(actor, order.storeId());
        ObjectNode result = mapper.createObjectNode().set("order", mapper.valueToTree(order));
        result.set("payments", mapper.valueToTree(jdbc.queryForList("SELECT id,method,status,amount,received_amount,expires_at,live_payment,version,legacy_adopted,transfer_content,bank_name,bank_code,account_no,account_name "
                + "FROM payment_service.payments WHERE order_id=? ORDER BY id", orderId)));
        var collections = jdbc.queryForList("SELECT id FROM payment_service.collections WHERE order_id=? ORDER BY created_at DESC LIMIT 1", UUID.class, orderId);
        if (!collections.isEmpty()) result.set("collection", collection(collections.getFirst()));
        return result;
    }

    @Transactional(readOnly=true)
    public ObjectNode codEvidence(long orderId) {
        CurrentActor actor=staff();
        var order=flow.context(orderId); scope(actor,order.storeId());
        var rows=jdbc.queryForList("SELECT order_id,order_code,store_id,uploaded_by,uploaded_at,mime_type,sha256,status,reviewed_by,reviewed_at,review_reason,version "
                + "FROM payment_service.cod_collection_evidence WHERE order_id=?",orderId);
        return rows.isEmpty() ? mapper.createObjectNode().put("status","MISSING") : (ObjectNode)mapper.valueToTree(rows.getFirst());
    }

    @Transactional(readOnly=true)
    public CodEvidenceImage codEvidenceImage(long orderId) {
        CurrentActor actor=staff();
        var order=flow.context(orderId); scope(actor,order.storeId());
        var rows=jdbc.queryForList("SELECT mime_type,image_bytes FROM payment_service.cod_collection_evidence WHERE order_id=?",orderId);
        if(rows.isEmpty())throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        return new CodEvidenceImage((String)rows.getFirst().get("mime_type"),(byte[])rows.getFirst().get("image_bytes"));
    }

    @Transactional
    public ObjectNode uploadCodEvidence(long orderId, MultipartFile file) {
        CurrentActor actor=staff();
        if(actor.role()!=Role.STAFF && actor.role()!=Role.STORE_MANAGER && actor.role()!=Role.ADMIN)
            throw new AccessDeniedException("Staff required");
        lockOrder(orderId);
        var order=flow.context(orderId); scope(actor,order.storeId()); requireCollectableCod(order);
        if(file==null || file.isEmpty() || file.getSize()>2L*1024*1024)
            throw new ApiException(file!=null && file.getSize()>2L*1024*1024 ? ErrorCode.REQUEST_TOO_LARGE : ErrorCode.VALIDATION_ERROR);
        String mime=file.getContentType();
        byte[] bytes;
        try { bytes=file.getBytes(); } catch(IOException ex) { throw new ApiException(ErrorCode.VALIDATION_ERROR); }
        if(bytes.length==0 || bytes.length>2*1024*1024 || !validImage(mime,bytes))
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        String digest;
        try { digest=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch(Exception ex) { throw new IllegalStateException("Cannot hash evidence",ex); }
        var existing=jdbc.queryForList("SELECT status,sha256 FROM payment_service.cod_collection_evidence WHERE order_id=? FOR UPDATE",orderId);
        if(!existing.isEmpty()) {
            var prior=existing.getFirst();
            if(digest.equals(prior.get("sha256")))return codEvidence(orderId);
        }
        jdbc.update("INSERT INTO payment_service.cod_collection_evidence(order_id,order_code,store_id,uploaded_by,mime_type,image_bytes,sha256,status,reviewed_by,reviewed_at) "
                + "VALUES (?,?,?,?,?,?,?,'APPROVED',?,now()) ON CONFLICT(order_id) DO UPDATE SET order_code=EXCLUDED.order_code,store_id=EXCLUDED.store_id,"
                + "uploaded_by=EXCLUDED.uploaded_by,uploaded_at=now(),mime_type=EXCLUDED.mime_type,image_bytes=EXCLUDED.image_bytes,sha256=EXCLUDED.sha256,"
                + "status='APPROVED',reviewed_by=EXCLUDED.reviewed_by,reviewed_at=now(),review_reason=NULL,version=cod_collection_evidence.version+1",
                orderId,order.orderCode(),order.storeId(),actor.userId(),mime,bytes,digest,actor.userId());
        return codEvidence(orderId);
    }

    @Transactional
    public ObjectNode reviewCodEvidence(long orderId, boolean approve, String reason) {
        CurrentActor actor=staff();
        if(actor.role()!=Role.STAFF && actor.role()!=Role.STORE_MANAGER && actor.role()!=Role.ADMIN)throw new AccessDeniedException("Staff required");
        if(!approve && (reason==null || reason.isBlank() || reason.length()>500))throw new ApiException(ErrorCode.VALIDATION_ERROR);
        lockOrder(orderId);
        var order=flow.context(orderId); scope(actor,order.storeId()); requireCollectableCod(order);
        var rows=jdbc.queryForList("SELECT status,uploaded_by,order_code,store_id FROM payment_service.cod_collection_evidence WHERE order_id=? FOR UPDATE",orderId);
        if(rows.size()!=1
                || !Objects.equals(rows.getFirst().get("store_id"),order.storeId())
                || !Objects.equals(rows.getFirst().get("order_code"),order.orderCode()))conflict();
        jdbc.update("UPDATE payment_service.cod_collection_evidence SET status=?,reviewed_by=?,reviewed_at=now(),review_reason=?,version=version+1 WHERE order_id=?",
                approve?"APPROVED":"REJECTED",actor.userId(),approve?null:reason.strip(),orderId);
        return codEvidence(orderId);
    }

    private void requireCollectableCod(PaymentFlow.Context order) {
        if(!"PENDING".equals(order.paymentStatus())
                || !Set.of("CONFIRMED","PREPARING","READY","SHIPPING").contains(order.status()))conflict();
    }

    private void lockOrder(long orderId) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,"payment-order:"+orderId);
    }

    private static boolean validImage(String mime, byte[] bytes) {
        if(mime==null)return false;
        return "image/jpeg".equals(mime) && bytes.length>=3 && (bytes[0]&255)==255 && (bytes[1]&255)==216 && (bytes[2]&255)==255
                || "image/png".equals(mime) && bytes.length>=8 && java.util.Arrays.equals(java.util.Arrays.copyOf(bytes,8),
                        new byte[]{(byte)137,80,78,71,13,10,26,10})
                || "image/webp".equals(mime) && bytes.length>=12
                        && new String(bytes,0,4,StandardCharsets.US_ASCII).equals("RIFF")
                        && new String(bytes,8,4,StandardCharsets.US_ASCII).equals("WEBP");
    }

    @Transactional
    public JsonNode collect(long orderId, CollectionRequest request, UUID key) {
        CurrentActor actor = staff();
        lock(actor, key, orderId);
        JsonNode replay = replay(actor, key, "collect:"+orderId, request);
        if (replay != null) return replay;
        var order = flow.context(orderId);
        scope(actor, order.storeId());
        // Online bank transfers are settled only through matched bank receipts.
        // The manual collection operation is reserved for online COD and counter orders.
        if ("WEB".equals(order.orderSource()) && !"COD".equals(order.paymentMethod())) conflict();
        if (!order.version().equals(request.orderVersion()) || !"PENDING".equals(order.paymentStatus()) || order.amount().signum() <= 0
                || !Set.of("PENDING_PAYMENT","CONFIRMED","PREPARING","READY").contains(order.status())
                || "PENDING_PAYMENT".equals(order.status()) && order.expiresAt()!=null && !order.expiresAt().isAfter(Instant.now())) conflict();
        validateCash(request.cashAmount(), request.transferAmount(), request.cashTendered(), request.cashChange());
        if(request.cashAmount().add(request.transferAmount()).signum()==0)throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if("WEB".equals(order.orderSource()) && "COD".equals(order.paymentMethod())) {
            requireCollectableCod(order);
            if(request.cashAmount().compareTo(order.amount())!=0 || request.transferAmount().signum()!=0)conflict();
            var proof=jdbc.queryForList("SELECT status,order_code,store_id FROM payment_service.cod_collection_evidence WHERE order_id=? FOR UPDATE",orderId);
            if(proof.size()!=1 || !"APPROVED".equals(proof.getFirst().get("status"))
                    || !Objects.equals(proof.getFirst().get("store_id"),order.storeId())
                    || !Objects.equals(proof.getFirst().get("order_code"),order.orderCode()))conflict();
        }
        if (!jdbc.queryForList("SELECT id FROM payment_service.collections WHERE order_id=? AND status IN ('PENDING','ACCEPTED')",UUID.class,orderId).isEmpty()) conflict();
        var bank = bankSnapshot(orderId, order.storeId(), request.transferAmount().signum()>0);
        if(!jdbc.queryForList("SELECT id FROM payment_service.payments WHERE order_id=? AND expires_at<=now() AND status IN ('PENDING','EXPIRED','CANCELLED')",Long.class,orderId).isEmpty())conflict();
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO payment_service.collections(id,order_id,order_code,customer_id,store_id,order_version,amount,cash_amount,transfer_amount,"
                + "cash_tendered,cash_change,reason,actor_id,actor_role,bank_name,bank_code,account_no) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                id,orderId,order.orderCode(),order.customerId(),order.storeId(),Timestamp.from(order.version()),order.amount(),request.cashAmount(),request.transferAmount(),
                request.cashTendered(),request.cashChange(),request.reason().strip(),actor.userId(),actor.role().name(),bank.get("bank_name"),bank.get("bank_code"),bank.get("account_no"));
        flow.enqueue("payment.received",orderId,mapper.createObjectNode().put("operationType","COLLECTION").put("collectionId",id.toString())
                .put("orderId",orderId).put("orderCode",order.orderCode()).put("storeId",order.storeId()).put("customerId",order.customerId())
                .put("amount",order.amount()).put("cashAmount",request.cashAmount()).put("declaredTransfer",request.transferAmount())
                .put("orderVersion",order.version().toString()).put("actorId",actor.userId()).put("actorRole",actor.role().name()));
        audit(actor,orderId,order.storeId(),"COLLECTION_DECLARED",key,request.reason());
        return save(actor,key,"collect:"+orderId,request,collection(id));
    }

    public static void validateCash(BigDecimal cash, BigDecimal transfer, BigDecimal tendered, BigDecimal change) {
        for (BigDecimal value : List.of(cash,transfer,tendered,change)) {
            if (value.signum()<0 || value.stripTrailingZeros().scale()>0 || value.compareTo(new BigDecimal("999999999999"))>0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (tendered.compareTo(cash)<0 || tendered.subtract(cash).compareTo(change)!=0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
    }

    private Map<String,Object> bankSnapshot(long orderId,long storeId,boolean required) {
        var payments=jdbc.queryForList("SELECT bank_name,bank_code,account_no FROM payment_service.payments WHERE order_id=? ORDER BY id DESC",orderId);
        if (payments.size() > 1) conflict();
        if (!payments.isEmpty()) return payments.getFirst();
        if (!required) return Map.of();
        var bindings=jdbc.queryForList("SELECT bank_name,bank_code,account_no FROM payment_service.store_bank_accounts assignment "
                + "JOIN payment_service.bank_accounts_config bank ON bank.id=assignment.bank_account_id WHERE assignment.store_id=? AND bank.is_active",storeId);
        return bindings.size()==1 ? bindings.getFirst() : Map.of();
    }

    @Transactional
    public JsonNode reconcile(long orderId, ReconcileRequest request, UUID key) {
        return reconcile(orderId, request, key, false);
    }

    @Transactional
    public JsonNode assign(long orderId, ReconcileRequest request, UUID key) {
        return reconcile(orderId, request, key, true);
    }

    private JsonNode reconcile(long orderId, ReconcileRequest request, UUID key, boolean pendingOnly) {
        CurrentActor actor=staff(); lock(actor,key,orderId);
        String action = (pendingOnly ? "assign:" : "reconcile:") + orderId;
        JsonNode replay=replay(actor,key,action,request); if(replay!=null)return replay;
        if ((request.paymentId()==null)==(request.collectionId()==null)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var order=flow.context(orderId); scope(actor,order.storeId());
        if (pendingOnly && (request.collectionId()!=null || request.acceptOriginalConflict())) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        pendingOnly = pendingOnly || actor.role()!=Role.ADMIN && request.collectionId()==null;
        if (pendingOnly && (!"PENDING_PAYMENT".equals(order.status()) || !"PENDING".equals(order.paymentStatus())
                || order.expiresAt()==null || !order.expiresAt().isAfter(Instant.now()))) conflict();
        boolean isCollection=request.collectionId()!=null;
        var target=isCollection ? one("SELECT * FROM payment_service.collections WHERE id=? AND order_id=? FOR UPDATE",request.collectionId(),orderId)
                : one("SELECT * FROM payment_service.payments WHERE id=? AND order_id=? FOR UPDATE",request.paymentId(),orderId);
        if (((Number)target.get("version")).longValue()!=request.targetVersion()) conflict();
        if (pendingOnly && (!Boolean.TRUE.equals(target.get("live_payment")) || !"PENDING".equals(target.get("status"))
                || target.get("closed_reason")!=null || !(target.get("expires_at") instanceof Timestamp expiry) || !expiry.toInstant().isAfter(Instant.now()))) conflict();
        if (!Objects.equals(target.get("store_id"),order.storeId()) || !Objects.equals(target.get("customer_id"),order.customerId())
                || !Objects.equals(target.get("order_code"),order.orderCode()) || ((BigDecimal)target.get("amount")).compareTo(order.amount())!=0) conflict();
        if (isCollection && !"ACCEPTED".equals(target.get("status"))) conflict();
        var receipt=one("SELECT * FROM payment_service.bank_transactions WHERE id=? FOR UPDATE",request.receiptId());
        boolean disputed=((Number)receipt.get("conflict_count")).longValue()!=0;
        if(request.acceptOriginalConflict()&&actor.role()!=Role.ADMIN)throw new AccessDeniedException("Admin required for conflict review");
        if (((Number)receipt.get("version")).longValue()!=request.receiptVersion() || disputed&&!request.acceptOriginalConflict()
                || receipt.get("webhook_fingerprint")==null || !"".equals(receipt.get("sub_account")) || !"in".equals(receipt.get("transfer_direction"))
                || receipt.get("collection_id")!=null && !(isCollection && disputed && request.acceptOriginalConflict() && Objects.equals(receipt.get("collection_id"),request.collectionId()))) conflict();
        Object classified=receipt.get("classified_store_id")!=null ? receipt.get("classified_store_id") : receipt.get("store_id");
        if (actor.role()!=Role.ADMIN && !Objects.equals(classified,order.storeId())) {
            boolean suggested = classified==null && "REFERENCE_NOT_FOUND".equals(receipt.get("reason"))
                    && Boolean.TRUE.equals(jdbc.queryForObject("SELECT bank_store_ids @> ARRAY[?]::bigint[] FROM payment_service.bank_transactions WHERE id=?",Boolean.class,order.storeId(),request.receiptId()));
            if (!suggested || isCollection || !"PENDING_PAYMENT".equals(order.status()) || !"PENDING".equals(order.paymentStatus())
                    || order.expiresAt()==null || !order.expiresAt().isAfter(Instant.now())) throw new AccessDeniedException("Store evidence required");
        }
        if (classified!=null && !Objects.equals(classified,order.storeId())) conflict();
        if (target.get("account_no")==null || !target.get("account_no").equals(receipt.get("bank_account"))) conflict();
        String gateway=TransferReference.normalize((String)receipt.get("bank_gateway"));
        if (gateway.isEmpty() || !(gateway.equals(TransferReference.normalize((String)target.get("bank_name")))
                || gateway.equals(TransferReference.normalize((String)target.get("bank_code"))))) conflict();
        if (receipt.get("candidate_payment_id")!=null) {
            Long candidateOrder=jdbc.queryForObject("SELECT order_id FROM payment_service.payments WHERE id=?",Long.class,receipt.get("candidate_payment_id"));
            if (!Objects.equals(candidateOrder,orderId)) conflict();
        }
        if(Set.of("STORE_ORDER_CONFLICT","STORE_REFERENCE_CONFLICT","AMBIGUOUS_REFERENCE").contains(String.valueOf(receipt.get("reason"))))conflict();
        if(disputed)jdbc.update("UPDATE payment_service.bank_transactions SET conflict_reviewed=true WHERE id=?",request.receiptId());
        if (isCollection) {
            if (((BigDecimal)target.get("transfer_amount")).signum()<=0) conflict();
            if(receipt.get("payment_id")!=null && !Objects.equals(orderId,jdbc.queryForObject("SELECT order_id FROM payment_service.payments WHERE id=?",Long.class,receipt.get("payment_id")))) conflict();
            jdbc.update("UPDATE payment_service.bank_transactions SET collection_id=?,classified_store_id=?,store_id=?,matched_order_code=?,status='MATCHED',reason='COLLECTION_EVIDENCE' WHERE id=?",
                    request.collectionId(),order.storeId(),order.storeId(),order.orderCode(),request.receiptId());
            jdbc.update("UPDATE payment_service.collections SET version=version+1 WHERE id=?",request.collectionId());
        } else {
            if(receipt.get("payment_id")!=null && !(disputed && request.acceptOriginalConflict() && Objects.equals(receipt.get("payment_id"),request.paymentId()))
                    || !"BANK_TRANSFER".equals(target.get("method"))) conflict();
            boolean live=Boolean.TRUE.equals(target.get("live_payment"));
            if(!live && "PENDING".equals(order.paymentStatus()) && !Set.of("CANCELLED","COMPLETED").contains(order.status())) conflict();
            jdbc.update("UPDATE payment_service.bank_transactions SET candidate_payment_id=?,candidate_order_code=?,classified_store_id=?,status='PENDING_RECONCILIATION',reason='MANUAL_ALLOCATION' WHERE id=?",
                    request.paymentId(),order.orderCode(),order.storeId(),request.receiptId());
            if(live) {
                boolean closed=Set.of("CANCELLED","COMPLETED").contains(order.status())
                        || target.get("closed_reason")!=null || "PENDING_PAYMENT".equals(order.status())&&order.expiresAt()!=null&&!order.expiresAt().isAfter(Instant.now());
                jdbc.update("UPDATE payment_service.bank_transactions SET payment_id=?,store_id=?,matched_order_code=?,status=?,reason='MANUAL_ALLOCATION' WHERE id=?",
                        request.paymentId(),order.storeId(),order.orderCode(),closed?"LATE_RECEIPT":"MATCHED",request.receiptId());
                flow.reconcile(request.paymentId());
            }
            else {
                jdbc.update("UPDATE payment_service.bank_transactions SET payment_id=?,store_id=?,matched_order_code=?,status='LATE_RECEIPT',reason='LEGACY_REVIEW' WHERE id=?",
                        request.paymentId(),order.storeId(),order.orderCode(),request.receiptId());
                jdbc.update("UPDATE payment_service.payments SET received_amount=(SELECT coalesce(sum(amount),0) FROM payment_service.bank_transactions WHERE payment_id=? AND transfer_direction='in' AND (conflict_count=0 OR conflict_reviewed)) WHERE id=?",request.paymentId(),request.paymentId());
            }
        }
        audit(actor,orderId,order.storeId(),"RECEIPT_RECONCILED",key,request.reason());
        jdbc.update("UPDATE payment_service.bank_transactions SET assigned_by=?,assigned_at=now(),assignment_reason=? WHERE id=?",
                actor.userId(),request.reason().strip(),request.receiptId());
        ObjectNode result=mapper.createObjectNode().put("orderId",orderId).put("receiptId",request.receiptId()).put("allocated",true);
        if(isCollection)result.set("collection",collection(request.collectionId()));
        return save(actor,key,action,request,result);
    }

    @Transactional
    public JsonNode adopt(long orderId,LegacyRequest request,UUID key) {
        CurrentActor actor=staff(); if(actor.role()!=Role.ADMIN)throw new AccessDeniedException("Admin required");
        lock(actor,key,orderId); JsonNode replay=replay(actor,key,"legacy:"+orderId,request); if(replay!=null)return replay;
        var order=flow.context(orderId);
        var payment=one("SELECT * FROM payment_service.payments WHERE id=? AND order_id=? FOR UPDATE",request.paymentId(),orderId);
        if(((Number)payment.get("version")).longValue()!=request.version() || Boolean.TRUE.equals(payment.get("live_payment"))
                || !"PENDING".equals(payment.get("status")) || !"PENDING_PAYMENT".equals(order.status()) || !"PENDING".equals(order.paymentStatus())
                || !"BANK_TRANSFER".equals(payment.get("method")) || !"BANK_TRANSFER".equals(order.paymentMethod())
                || !Objects.equals(payment.get("store_id"),order.storeId()) || !Objects.equals(payment.get("customer_id"),order.customerId())
                || !Objects.equals(payment.get("order_code"),order.orderCode()) || ((BigDecimal)payment.get("amount")).compareTo(order.amount())!=0) conflict();
        for(String field:List.of("bank_name","bank_code","account_no","account_name","transfer_content")) {
            if(!(payment.get(field) instanceof String value)||value.isBlank())conflict();
        }
        Timestamp expires=(Timestamp)payment.get("expires_at"); if(expires==null || !expires.toInstant().isAfter(Instant.now()))conflict();
        if(jdbc.queryForObject("SELECT count(*) FROM payment_service.payments WHERE order_id=?",Long.class,orderId)!=1L)conflict();
        if(!expires.toInstant().equals(order.expiresAt()))conflict();
        jdbc.update("UPDATE payment_service.payments SET live_payment=true,legacy_adopted=true WHERE id=?",request.paymentId());
        audit(actor,orderId,order.storeId(),"LEGACY_ADOPTED",key,request.reason());
        return save(actor,key,"legacy:"+orderId,request,mapper.createObjectNode().put("paymentId",request.paymentId()).put("adopted",true));
    }

    @Transactional
    public void resolve(DomainEvent event) {
        if(!"cart-order-service".equals(event.sourceService())||!"order.payment-resolved".equals(event.eventType()))throw new IllegalArgumentException("Invalid collection decision source");
        var payload=event.payload(); UUID id=UUID.fromString(payload.path("collectionId").asText());
        long orderId=payload.path("orderId").asLong();
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,"payment-order:"+orderId);
        var row=one("SELECT * FROM payment_service.collections WHERE id=? AND order_id=? FOR UPDATE",id,orderId);
        if(!Objects.equals(row.get("customer_id"),payload.path("customerId").asLong())||!Objects.equals(row.get("store_id"),payload.path("storeId").asLong())
                ||!Objects.equals(row.get("order_code"),payload.path("orderCode").asText()))throw new IllegalArgumentException("Collection decision mismatch");
        String decision=payload.path("decision").asText();
        if(!Set.of("ACCEPTED","CANCELLED","EXPIRED","SUPERSEDED","STALE_VERSION").contains(decision))throw new IllegalArgumentException("Invalid collection decision");
        if(!"PENDING".equals(row.get("status")))return;
        jdbc.update("UPDATE payment_service.collections SET status=?,version=version+1,resolved_at=now() WHERE id=?",decision,id);
        if("ACCEPTED".equals(decision)) {
            jdbc.update("UPDATE payment_service.payments SET status='COLLECTED' WHERE order_id=? AND status IN ('PENDING','EXPIRED','CANCELLED')",orderId);
            flow.linkCollection(orderId);
            BigDecimal cash=(BigDecimal)row.get("cash_amount"),transfer=(BigDecimal)row.get("transfer_amount");
            String method=cash.signum()>0 ? transfer.signum()>0 ? "MIXED":"CASH" : transfer.signum()>0 ? "BANK_TRANSFER":"UNVERIFIED";
            flow.enqueue("payment.confirmed",orderId,mapper.createObjectNode().put("operationType","COLLECTION").put("collectionId",id.toString())
                    .put("orderId",orderId).put("orderCode",(String)row.get("order_code")).put("customerId",((Number)row.get("customer_id")).longValue())
                    .put("storeId",((Number)row.get("store_id")).longValue()).put("amount",(BigDecimal)row.get("amount")).put("totalAmount",(BigDecimal)row.get("amount"))
                    .put("status","COLLECTED").put("outcome","CONFIRMED").put("paymentMethod",method).put("cashAmount",cash).put("declaredTransfer",transfer));
        } else {
            for (Long paymentId : jdbc.queryForList("SELECT id FROM payment_service.payments WHERE order_id=? AND live_payment AND status='PENDING'",Long.class,orderId)) flow.reconcile(paymentId);
        }
    }

    private ObjectNode collection(UUID id) {
        var row=one("SELECT id,order_id,status,version,amount,cash_amount,transfer_amount,cash_tendered,cash_change,reason,actor_id,actor_role,created_at FROM payment_service.collections WHERE id=?",id);
        ObjectNode result=mapper.valueToTree(row);
        BigDecimal linked=jdbc.queryForObject("SELECT coalesce(sum(amount),0) FROM payment_service.bank_transactions WHERE collection_id=? AND (conflict_count=0 OR conflict_reviewed)",BigDecimal.class,id);
        BigDecimal declared=(BigDecimal)row.get("transfer_amount"),cash=(BigDecimal)row.get("cash_amount"),total=(BigDecimal)row.get("amount");
        result.put("bankEvidence",linked).put("pendingTransfer",declared.subtract(linked).max(BigDecimal.ZERO))
                .put("operationalReceived",cash.add(declared)).put("discrepancy",cash.add(declared).subtract(total)).put("bankExcess",linked.subtract(declared).max(BigDecimal.ZERO));
        return result;
    }

    private CurrentActor staff() {
        CurrentActor actor=CurrentActor.require();
        if(!Set.of(Role.ADMIN,Role.STAFF,Role.STORE_MANAGER).contains(actor.role()))throw new AccessDeniedException("Staff required");
        return actor;
    }
    private void scope(CurrentActor actor,Long storeId) {
        if(actor.role()!=Role.ADMIN&&!Objects.equals(actor.storeId(),storeId))throw new AccessDeniedException("Store required");
    }
    private Map<String,Object> one(String sql,Object... args) {
        return jdbc.queryForList(sql,args).stream().findFirst().orElseThrow(()->new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
    }
    private void lock(CurrentActor actor,UUID key,long orderId) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,"payment-operation:"+actor.userId()+":"+key);
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,"payment-order:"+orderId);
    }
    private String hash(String action,Object request) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((action+mapper.writeValueAsString(request)).getBytes(StandardCharsets.UTF_8)));}
        catch(Exception failure){throw new IllegalStateException("Cannot encode payment operation");}
    }
    private JsonNode replay(CurrentActor actor,UUID key,String action,Object request) {
        var rows=jdbc.queryForList("SELECT request_hash,response::text FROM payment_service.operations WHERE actor_id=? AND operation_key=?",actor.userId(),key);
        if(rows.isEmpty())return null;
        scope(actor,flow.context(Long.parseLong(action.substring(action.indexOf(':')+1))).storeId());
        if(!hash(action,request).equals(rows.getFirst().get("request_hash")))conflict();
        try{return mapper.readTree(rows.getFirst().get("response").toString());}catch(Exception failure){throw new IllegalStateException("Invalid stored operation");}
    }
    private JsonNode save(CurrentActor actor,UUID key,String action,Object request,JsonNode response) {
        jdbc.update("INSERT INTO payment_service.operations(actor_id,operation_key,request_hash,response) VALUES (?,?,?,?::jsonb)",actor.userId(),key,hash(action,request),response.toString());
        return response;
    }
    private void audit(CurrentActor actor,long orderId,long storeId,String action,UUID key,String reason) {
        jdbc.update("INSERT INTO payment_service.payment_audit(actor_id,store_id,action,reason,evidence_reference) VALUES (?,?,?,?,?)",actor.userId(),storeId,action,reason.strip(),key.toString());
        var payload=mapper.createObjectNode().put("actorId",actor.userId()).put("actorRole",actor.role().name()).put("storeId",storeId)
                .put("action",action).put("targetType","Order").put("targetId",orderId);
        var token=(org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken)org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        payload.putObject("detail").put("operationKey",key.toString()).put("reason",reason.strip())
                .put("sessionId",token.getToken().getClaimAsString("sid")).put("identity","SHARED_ACCOUNT_NOT_PERSON");
        flow.enqueue("audit.recorded",orderId,payload);
    }
    private static void conflict(){throw new ApiException(ErrorCode.RESOURCE_CONFLICT);}
}
