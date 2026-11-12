package com.clucky.paymentservice.service;

import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.Role;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Local-only payment fixture. Never enabled in a deployed environment. */
@Service
@ConditionalOnProperty(name = "payment.local-simulation.enabled", havingValue = "true")
public class LocalPaymentSimulationService {
    private final JdbcTemplate jdbc;
    private final PaymentFlow flow;

    public LocalPaymentSimulationService(JdbcTemplate jdbc, PaymentFlow flow) {
        this.jdbc = jdbc;
        this.flow = flow;
    }

    @Transactional
    public PaymentFlow.Summary confirm(long orderId) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.CUSTOMER) throw new AccessDeniedException("Customer required");
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class, "payment-order:" + orderId);
        var order = flow.context(orderId);
        if (!actor.userId().equals(order.customerId())) throw new AccessDeniedException("Order owner required");
        if (!"WEB".equals(order.orderSource()) || !"BANK_TRANSFER".equals(order.paymentMethod())
                || !"PENDING_PAYMENT".equals(order.status()) || !"PENDING".equals(order.paymentStatus())
                || order.expiresAt() == null || !order.expiresAt().isAfter(Instant.now())) conflict();

        var rows = jdbc.queryForList("SELECT id,order_code,customer_id,store_id,amount,received_amount,status,expires_at,"
                + "transfer_content,account_no,bank_code,live_payment,closed_reason,receipt_proposed "
                + "FROM payment_service.payments WHERE order_id=? FOR UPDATE", orderId);
        if (rows.size() != 1) conflict();
        var payment = rows.getFirst();
        long paymentId = ((Number) payment.get("id")).longValue();
        if (!Boolean.TRUE.equals(payment.get("live_payment")) || !"PENDING".equals(payment.get("status"))
                || payment.get("closed_reason") != null || Boolean.TRUE.equals(payment.get("receipt_proposed"))
                || !order.orderCode().equals(payment.get("order_code"))
                || !order.customerId().equals(payment.get("customer_id"))
                || !order.storeId().equals(payment.get("store_id"))
                || order.amount().compareTo((BigDecimal) payment.get("amount")) != 0
                || ((BigDecimal) payment.get("received_amount")).signum() != 0
                || !(payment.get("expires_at") instanceof Timestamp expires) || !expires.toInstant().isAfter(Instant.now())
                || payment.get("transfer_content") == null || payment.get("account_no") == null
                || payment.get("bank_code") == null) conflict();
        // A real receipt may already be waiting to reconcile. Do not mix it with test money.
        if (!jdbc.queryForList("SELECT id FROM payment_service.bank_transactions WHERE candidate_payment_id=? OR payment_id=?",
                Long.class, paymentId, paymentId).isEmpty()) conflict();

        String fixtureId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO payment_service.bank_transactions "
                + "(bank_tx_id,bank_account,amount,content,bank_gateway,transfer_direction,received_at,bank_occurred_at,"
                + "webhook_fingerprint,sub_account,status,reason,candidate_payment_id,candidate_order_code,classified_store_id,"
                + "classification_evidence,raw_payload) "
                + "VALUES (?,?,?, ?,?,'in',now(),now(),?,'','PENDING_RECONCILIATION','LOCAL_SIMULATION',?,?,?,"
                + "'{\"source\":\"LOCAL_SIMULATION\"}'::jsonb,'{\"source\":\"LOCAL_SIMULATION\"}'::jsonb)",
                "LOCAL:" + fixtureId, payment.get("account_no"), payment.get("amount"), payment.get("transfer_content"),
                payment.get("bank_code"), fixtureId.replace("-", ""), paymentId, order.orderCode(), order.storeId());
        flow.reconcile(paymentId);
        return flow.get(orderId);
    }

    private static void conflict() { throw new ApiException(ErrorCode.RESOURCE_CONFLICT); }
}
