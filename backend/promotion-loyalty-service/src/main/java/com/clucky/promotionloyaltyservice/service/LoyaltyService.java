package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.LoyaltyData.*;
import com.clucky.promotionloyaltyservice.exception.BadRequestException;
import com.clucky.promotionloyaltyservice.exception.ConflictException;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class LoyaltyService {
    private final JdbcTemplate jdbc;
    private final VoucherAuditOutbox audit;
    public LoyaltyService(JdbcTemplate jdbc, VoucherAuditOutbox audit) { this.jdbc = jdbc; this.audit = audit; }

    public Policy policy() {
        return jdbc.query("SELECT * FROM promotion_service.loyalty_policy ORDER BY version DESC LIMIT 1", this::policyRow).getFirst();
    }
    private Policy policyRow(java.sql.ResultSet row, int index) throws java.sql.SQLException {
        return new Policy(row.getLong("version"), row.getLong("spend_per_point"), row.getLong("point_value"),
                row.getLong("silver_threshold"), row.getLong("gold_threshold"), row.getInt("silver_discount"), row.getInt("gold_discount"));
    }
    @Transactional
    public Policy configure(PolicyInput input, long actor) {
        if (input.goldThreshold() <= input.silverThreshold() || input.goldDiscount() < input.silverDiscount())
            throw new BadRequestException("Invalid tier thresholds");
        jdbc.execute("LOCK TABLE promotion_service.loyalty_policy IN EXCLUSIVE MODE");
        Policy before = policy();
        if (before.version() != input.version()) throw new ConflictException("Policy changed; reload before saving");
        jdbc.update("INSERT INTO promotion_service.loyalty_policy(spend_per_point,point_value,silver_threshold,gold_threshold,silver_discount,gold_discount,updated_by) VALUES (?,?,?,?,?,?,?)",
                input.spendPerPoint(), input.pointValue(), input.silverThreshold(), input.goldThreshold(), input.silverDiscount(), input.goldDiscount(), actor);
        Policy after = policy();
        audit.record(actor, "ADMIN", null, "LOYALTY_POLICY_UPDATED", "LOYALTY_POLICY", after.version(), before, after);
        return after;
    }
    private Balance balance(long customerId, Policy policy, boolean lock) {
        if (lock) jdbc.update("INSERT INTO promotion_service.member_points(customer_id) VALUES (?) ON CONFLICT (customer_id) DO NOTHING", customerId);
        List<Balance> rows = jdbc.query("SELECT * FROM promotion_service.member_points WHERE customer_id=?" + (lock ? " FOR UPDATE" : ""),
                (row, index) -> new Balance(customerId, row.getLong("total_points"), row.getLong("reserved_points"),
                        row.getLong("total_points") - row.getLong("reserved_points"), row.getLong("lifetime_points"),
                        LoyaltyMath.tier(row.getLong("lifetime_points"), policy)), customerId);
        return rows.isEmpty() ? new Balance(customerId, 0, 0, 0, 0, "MEMBER") : rows.getFirst();
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Overview overview(long customerId, int page, int size, String type) {
        if (page < 0 || page > 1000000 || size < 1 || size > 50 || !List.of("ALL", "EARN", "REDEEM", "ADJUST").contains(type))
            throw new BadRequestException("Invalid history filter");
        Policy policy = policy();
        String where = " WHERE customer_id=? AND (?='ALL' OR type=?)";
        List<Entry> entries = jdbc.query("SELECT * FROM promotion_service.point_transactions" + where + " ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
                (row, index) -> new Entry(row.getLong("id"), row.getObject("order_id", Long.class), row.getInt("change"),
                        row.getLong("balance_after"), row.getString("type"), row.getString("reason"), row.getTimestamp("created_at").toInstant()),
                customerId, type, type, size, (long) page * size);
        long total = jdbc.queryForObject("SELECT count(*) FROM promotion_service.point_transactions" + where, Long.class, customerId, type, type);
        return new Overview(balance(customerId, policy, false), policy, entries, page, size, total);
    }
    public Quote preview(PreviewInput input) {
        Policy policy = policy();
        Balance balance = balance(input.customerId(), policy, false);
        return calculate(balance, input.pointsToRedeem(), input.orderAmount(), policy);
    }
    private Quote calculate(Balance balance, int points, BigDecimal amount, Policy policy) {
        try { return LoyaltyMath.quote(balance.availablePoints(), balance.lifetimePoints(), points, amount, policy); }
        catch (ArithmeticException | IllegalArgumentException failure) { throw new BadRequestException("Invalid loyalty amount"); }
    }
    @Transactional
    public Quote reserve(ReserveInput input) {
        List<Policy> versions = jdbc.query("SELECT * FROM promotion_service.loyalty_policy WHERE version=?", this::policyRow, input.policyVersion());
        if (versions.isEmpty()) throw new BadRequestException("Unknown policy");
        Policy policy = versions.getFirst();
        Balance balance = balance(input.customerId(), policy, true);
        var previous = jdbc.queryForList("SELECT * FROM promotion_service.loyalty_orders WHERE order_id=? FOR UPDATE", input.orderId());
        if (!previous.isEmpty()) {
            var row = previous.getFirst();
            if (((Number) row.get("customer_id")).longValue() != input.customerId()
                    || ((Number) row.get("points")).intValue() != input.pointsToRedeem()
                    || ((BigDecimal) row.get("eligible_amount")).compareTo(input.orderAmount()) != 0
                    || ((Number) row.get("policy_version")).longValue() != input.policyVersion()
                    || ((BigDecimal) row.get("points_amount")).compareTo(input.pointsAmount()) != 0
                    || ((BigDecimal) row.get("tier_discount")).compareTo(input.tierDiscount()) != 0
                    || "CANCELLED".equals(row.get("state"))) throw new ConflictException("Reservation mismatch");
            return new Quote(policy.version(), Math.toIntExact(balance.availablePoints()), input.pointsToRedeem(), input.pointsAmount(),
                    ((Number) row.get("earned_points")).intValue(), balance.tier(), input.tierDiscount());
        }
        Quote quote = calculate(balance, input.pointsToRedeem(), input.orderAmount(), policy);
        if (quote.pointsUsed() != input.pointsToRedeem() || quote.pointsAmount().compareTo(input.pointsAmount()) != 0
                || quote.tierDiscount().compareTo(input.tierDiscount()) != 0) throw new ConflictException("Loyalty changed; preview again");
        jdbc.update("INSERT INTO promotion_service.loyalty_orders(order_id,customer_id,points,points_amount,tier_discount,eligible_amount,earned_points,policy_version,state) VALUES (?,?,?,?,?,?,?,?,'RESERVED')",
                input.orderId(), input.customerId(), quote.pointsUsed(), quote.pointsAmount(), quote.tierDiscount(), input.orderAmount(), quote.pointsToEarn(), policy.version());
        jdbc.update("UPDATE promotion_service.member_points SET reserved_points=reserved_points+?,updated_at=now() WHERE customer_id=?", quote.pointsUsed(), input.customerId());
        if (quote.pointsUsed() > 0) entry(input.customerId(), input.orderId(), 0, balance.totalPoints(), "ADJUST", "RESERVED", policy.version(), null, null);
        return quote;
    }
    @Transactional
    public void settle(long orderId, long customerId, String status, String eventId, String correlationId) {
        Policy policy = policy();
        Balance balance = balance(customerId, policy, true);
        var rows = jdbc.queryForList("SELECT * FROM promotion_service.loyalty_orders WHERE order_id=? FOR UPDATE", orderId);
        if (rows.isEmpty()) return;
        var row = rows.getFirst();
        if (((Number) row.get("customer_id")).longValue() != customerId) throw new ConflictException("Order owner mismatch");
        String state = (String) row.get("state");
        if ("COMPLETED".equals(state) || "CANCELLED".equals(state)) return;
        int used = ((Number) row.get("points")).intValue();
        int earned = ((Number) row.get("earned_points")).intValue();
        long version = ((Number) row.get("policy_version")).longValue();
        if ("CANCELLED".equals(status) || "MISSING".equals(status)) {
            jdbc.update("UPDATE promotion_service.member_points SET reserved_points=reserved_points-?,updated_at=now() WHERE customer_id=?", used, customerId);
            if (used > 0) entry(customerId, orderId, 0, balance.totalPoints(), "ADJUST", "RELEASED", version, eventId, correlationId);
            status = "CANCELLED";
        } else if ("COMPLETED".equals(status)) {
            long afterRedeem = balance.totalPoints() - used;
            long afterEarn = Math.addExact(afterRedeem, earned);
            long lifetime = Math.addExact(balance.lifetimePoints(), earned);
            if (used > 0) entry(customerId, orderId, -used, afterRedeem, "REDEEM", "REDEEMED", version, eventId, correlationId);
            if (earned > 0) entry(customerId, orderId, earned, afterEarn, "EARN", "EARNED", version, eventId, correlationId);
            jdbc.update("UPDATE promotion_service.member_points SET total_points=?,reserved_points=reserved_points-?,lifetime_points=?,tier=?,updated_at=now() WHERE customer_id=?",
                    Math.toIntExact(afterEarn), used, lifetime, LoyaltyMath.tier(lifetime, policy), customerId);
        } else {
            status = "CONFIRMED";
        }
        jdbc.update("UPDATE promotion_service.loyalty_orders SET state=?,updated_at=now() WHERE order_id=?", status, orderId);
    }
    public record PendingOrder(long orderId, long customerId) {}
    public List<PendingOrder> pending() {
        return jdbc.query("""
                SELECT order_id,customer_id FROM (
                  SELECT order_id,customer_id,updated_at FROM promotion_service.loyalty_orders WHERE state IN ('RESERVED','CONFIRMED')
                  UNION ALL
                  SELECT order_id,customer_id,updated_at FROM promotion_service.voucher_reservations WHERE state='RESERVED'
                ) pending WHERE updated_at < now()-interval '5 minutes'
                GROUP BY order_id,customer_id ORDER BY min(updated_at),order_id LIMIT 100
                """,
                (row, index) -> new PendingOrder(row.getLong("order_id"), row.getLong("customer_id")));
    }
    private void entry(long customerId, long orderId, int change, long balance, String type, String action, long version, String eventId, String correlationId) {
        jdbc.update("INSERT INTO promotion_service.point_transactions(customer_id,order_id,change,balance_after,type,operation_key,reason,policy_version,event_id,correlation_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
                customerId, orderId, change, balance, type, orderId + ":" + action, action, version, eventId, correlationId);
    }
}
