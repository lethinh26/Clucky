package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.AdminPointsData.Adjustment;
import com.clucky.promotionloyaltyservice.dto.AdminPointsData.AdjustmentRequest;
import com.clucky.promotionloyaltyservice.dto.AdminPointsData.Overview;
import com.clucky.promotionloyaltyservice.exception.BadRequestException;
import com.clucky.promotionloyaltyservice.exception.ConflictException;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminPointsService {
    private final JdbcTemplate jdbc;
    private final LoyaltyService loyalty;
    private final VoucherAuditOutbox audit;
    private final AdminCustomerProof customerProof;

    public AdminPointsService(JdbcTemplate jdbc, LoyaltyService loyalty, VoucherAuditOutbox audit,
            AdminCustomerProof customerProof) {
        this.jdbc = jdbc;
        this.loyalty = loyalty;
        this.audit = audit;
        this.customerProof = customerProof;
    }

    @Transactional(readOnly = true)
    public Overview overview(long customerId) {
        customerProof.verify(customerId);
        return snapshot(customerId);
    }

    @Transactional
    public Overview adjust(long customerId, long actorId, AdjustmentRequest input) {
        String reason = input.reason().trim();
        if (reason.length() < 3 || actorId <= 0) throw new BadRequestException("Adjustment requires a reason and actor");
        // Verify actual ownership with Identity before creating a wallet. The
        // promotion DB intentionally has no foreign key to another service.
        customerProof.verify(customerId);
        // The wallet row serializes adjustment, redemption, refund and claim activity.
        jdbc.update("INSERT INTO promotion_service.member_points(customer_id) VALUES (?) ON CONFLICT (customer_id) DO NOTHING", customerId);
        Map<String, Object> wallet = jdbc.queryForMap("""
                SELECT id, total_points, reserved_points, lifetime_points, wallet_state
                FROM promotion_service.member_points WHERE customer_id=? FOR UPDATE
                """, customerId);
        if (!"ACTIVE".equals(wallet.get("wallet_state"))) throw new ConflictException("Wallet is not active");
        long previous = ((Number) wallet.get("total_points")).longValue();
        long reserved = ((Number) wallet.get("reserved_points")).longValue();
        long next = input.newTotalPoints();
        String operation = "admin-points:" + input.operationId();
        // An identical retried request succeeds without another ledger entry or audit event.
        var original = jdbc.queryForList("""
                SELECT customer_id,change,balance_after,reason,actor_id
                FROM promotion_service.point_transactions WHERE operation_key=?
                """, operation);
        if (!original.isEmpty()) {
            var entry = original.getFirst();
            long originalNext = ((Number) entry.get("balance_after")).longValue();
            long originalPrevious = originalNext - ((Number) entry.get("change")).longValue();
            if (((Number) entry.get("customer_id")).longValue() != customerId
                    || ((Number) entry.get("actor_id")).longValue() != actorId
                    || originalNext != next || originalPrevious != input.expectedTotalPoints()
                    || !reason.equals(entry.get("reason"))) {
                throw new ConflictException("Adjustment operation already used with different values");
            }
            return snapshot(customerId);
        }
        if (previous != input.expectedTotalPoints()) throw new ConflictException("Points changed; reload before saving");
        if (next < reserved) throw new ConflictException("Cannot reduce points below reserved points");
        if (next == previous) throw new BadRequestException("Choose a different points total");
        long max = loyalty.policy().maxPointBalance();
        if (max > 0 && next > max) throw new ConflictException("New total exceeds points policy limit");
        long delta = Math.subtractExact(next, previous);
        // Insert the idempotency key before updating the balance. A conflict rolls back the whole operation.
        int recorded = jdbc.update("""
                INSERT INTO promotion_service.point_transactions
                (customer_id,wallet_id,origin_wallet_id,change,balance_after,type,operation_key,reason,actor_id)
                VALUES (?,?,?, ?,?,'ADJUST',?,?,?) ON CONFLICT DO NOTHING
                """, customerId, wallet.get("id"), wallet.get("id"), delta, next, operation, reason, actorId);
        if (recorded != 1) throw new ConflictException("Adjustment operation already used; reload before retrying");
        jdbc.update("UPDATE promotion_service.member_points SET total_points=?,updated_at=now() WHERE id=?", next, wallet.get("id"));
        audit.record(actorId, "ADMIN", null, "LOYALTY_POINTS_ADJUSTED", "CUSTOMER", customerId,
                Map.of("totalPoints", previous, "reservedPoints", reserved, "lifetimePoints", wallet.get("lifetime_points")),
                Map.of("totalPoints", next, "reservedPoints", reserved, "reason", reason,
                        "operationId", input.operationId().toString()));
        return snapshot(customerId);
    }

    private Overview snapshot(long customerId) {
        var points = loyalty.overview(customerId, 0, 1, "ALL").points();
        List<Adjustment> adjustments = jdbc.query("""
                SELECT id,actor_id,change,balance_after,reason,created_at
                FROM promotion_service.point_transactions
                WHERE customer_id=? AND type='ADJUST' AND actor_id IS NOT NULL
                ORDER BY created_at DESC,id DESC LIMIT 30
                """, (row, ignored) -> {
                    long next = row.getLong("balance_after");
                    long delta = row.getLong("change");
                    return new Adjustment(row.getLong("id"), row.getLong("actor_id"), next - delta,
                            next, delta, row.getString("reason"), row.getTimestamp("created_at").toInstant());
                }, customerId);
        return new Overview(points, adjustments);
    }
}
