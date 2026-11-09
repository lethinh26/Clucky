ALTER TABLE promotion_service.member_points
  ADD COLUMN reserved_points INTEGER NOT NULL DEFAULT 0 CHECK (reserved_points >= 0),
  ADD COLUMN lifetime_points BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  ADD CONSTRAINT member_reservation_limit CHECK (reserved_points <= total_points);
UPDATE promotion_service.member_points SET lifetime_points = total_points;

ALTER TABLE promotion_service.point_transactions
  ADD COLUMN policy_version BIGINT,
  ADD COLUMN event_id VARCHAR(160),
  ADD COLUMN correlation_id VARCHAR(128);
INSERT INTO promotion_service.point_transactions(customer_id, change, balance_after, type, operation_key, reason)
SELECT member.customer_id, member.total_points - COALESCE(history.balance, 0), member.total_points,
  'ADJUST', 'opening:' || member.customer_id, 'OPENING_BALANCE'
FROM promotion_service.member_points member
LEFT JOIN (SELECT customer_id, SUM(change) AS balance FROM promotion_service.point_transactions GROUP BY customer_id) history
ON history.customer_id = member.customer_id
WHERE member.total_points <> COALESCE(history.balance, 0);
CREATE INDEX point_history_customer ON promotion_service.point_transactions(customer_id, created_at DESC, id DESC);

CREATE TABLE promotion_service.loyalty_policy (
  version BIGSERIAL PRIMARY KEY,
  spend_per_point BIGINT NOT NULL CHECK (spend_per_point > 0),
  point_value BIGINT NOT NULL CHECK (point_value > 0),
  silver_threshold BIGINT NOT NULL CHECK (silver_threshold > 0),
  gold_threshold BIGINT NOT NULL CHECK (gold_threshold > silver_threshold),
  silver_discount INTEGER NOT NULL CHECK (silver_discount BETWEEN 0 AND 100),
  gold_discount INTEGER NOT NULL CHECK (gold_discount BETWEEN silver_discount AND 100),
  updated_by BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO promotion_service.loyalty_policy(spend_per_point, point_value, silver_threshold, gold_threshold, silver_discount, gold_discount)
VALUES (10000, 1000, 1000, 5000, 3, 5);

CREATE TABLE promotion_service.loyalty_orders (
  order_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  points INTEGER NOT NULL CHECK (points >= 0),
  points_amount NUMERIC(12,0) NOT NULL CHECK (points_amount >= 0),
  tier_discount NUMERIC(12,0) NOT NULL CHECK (tier_discount >= 0),
  eligible_amount NUMERIC(12,0) NOT NULL CHECK (eligible_amount >= 0),
  earned_points INTEGER NOT NULL CHECK (earned_points >= 0),
  policy_version BIGINT NOT NULL REFERENCES promotion_service.loyalty_policy(version),
  state VARCHAR(20) NOT NULL CHECK (state IN ('RESERVED','CONFIRMED','COMPLETED','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX loyalty_pending_orders ON promotion_service.loyalty_orders(updated_at) WHERE state IN ('RESERVED','CONFIRMED');
