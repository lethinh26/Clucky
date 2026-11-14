package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderItem;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.repository.OrderItemRepository;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.OrderStatusHistoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/** Receives authenticated-by-origin domain events; never trusts a client status flag. */
@Service
public class ShippingOrderProjection {
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final OrderStatusHistoryRepository history;
    private final JdbcTemplate jdbc;
    private final OrderEventPublisher publisher;

    public ShippingOrderProjection(OrderRepository orders, OrderItemRepository items,
            OrderStatusHistoryRepository history, JdbcTemplate jdbc, OrderEventPublisher publisher) {
        this.orders = orders;
        this.items = items;
        this.history = history;
        this.jdbc = jdbc;
        this.publisher = publisher;
    }

    @Transactional
    public void apply(DomainEvent event) {
        JsonNode payload = event.payload();
        if (!"shipping-service".equals(event.sourceService())
                || !"SIMULATOR".equals(payload.path("source").asText())
                || !payload.path("simulationOnly").asBoolean(false)
                || !payload.path("orderId").canConvertToLong()
                || !payload.path("storeId").canConvertToLong()
                || !payload.path("attemptNumber").canConvertToInt()
                || payload.path("attemptNumber").asInt() < 1) {
            throw new IllegalArgumentException("Invalid shipping simulation event");
        }

        long orderId = payload.path("orderId").asLong();
        int attempt = payload.path("attemptNumber").asInt();
        Order order = orders.lockById(orderId)
                .orElseThrow(() -> new IllegalStateException("Shipping event arrived before its order"));
        if (!"DELIVERY".equals(order.getType()) || !order.getStoreId().equals(payload.path("storeId").asLong())) {
            throw new IllegalArgumentException("Shipping event order/store mismatch");
        }

        Integer lastAttempt = jdbc.queryForObject(
                "SELECT COALESCE(MAX(attempt_number), 0) FROM order_service.mock_delivery_receipts WHERE order_id = ?",
                Integer.class, orderId);
        if (lastAttempt != null && attempt < lastAttempt) return;

        String phase = switch (event.eventType()) {
            case "shipping.started" -> "SHIPPING";
            case "shipping.delivered" -> "DELIVERED";
            case "shipping.failed" -> "FAILED";
            case "shipping.resolved" -> "CLOSED";
            default -> throw new IllegalArgumentException("Unexpected shipping event type");
        };
        int inserted = jdbc.update("""
                INSERT INTO order_service.mock_delivery_receipts(event_id, order_id, attempt_number, phase)
                VALUES (?, ?, ?, ?) ON CONFLICT (event_id) DO NOTHING
                """, event.eventId(), orderId, attempt, phase);
        if (inserted == 0) return;

        String current = order.getStatus();
        if ("CANCELLED".equals(current) || "COMPLETED".equals(current) || "DELIVERY_FAILED".equals(current)) return;
        if ("shipping.started".equals(event.eventType())) {
            // Real QR is customer prepaid. For unpaid COD, pickup first records
            // a simulated rider settlement to the merchant, not customer cash.
            if ("COD".equals(order.getPaymentMethod())
                    && !List.of("PAID", "COLLECTED").contains(order.getPaymentStatus())
                    && !payload.path("simulatedAdvanceConfirmed").asBoolean(false)) {
                throw new IllegalArgumentException("Rider mock merchant advance is missing");
            }
            if ("READY".equals(current)) change(order, "SHIPPING", "Shipper giả lập đã nhận hàng");
            else if (!"SHIPPING".equals(current)) throw new IllegalStateException("Order is not ready for shipping");
            return;
        }
        if ("shipping.failed".equals(event.eventType())) {
            // A failed attempt is still awaiting a manager decision. Leave Order.SHIPPING.
            if (!"SHIPPING".equals(current) && !"READY".equals(current)) {
                throw new IllegalStateException("Order cannot receive shipping failure");
            }
            return;
        }

        if ("READY".equals(current)) {
            // Shipping topics may reach distinct partitions in a different order.
            change(order, "SHIPPING", "Shipper giả lập đã nhận hàng");
            current = "SHIPPING";
        }
        if (!"SHIPPING".equals(current)) {
            throw new IllegalStateException("Order not in shipping state");
        }

        if ("shipping.delivered".equals(event.eventType())) {
            if (!payload.path("proofRecorded").asBoolean(false)) {
                throw new IllegalArgumentException("Mock delivery has no proof");
            }
            boolean cod = "COD".equals(order.getPaymentMethod());
            boolean paid = List.of("PAID", "COLLECTED").contains(order.getPaymentStatus());
            if (cod && !paid && !payload.path("simulatedAdvanceConfirmed").asBoolean(false)) {
                throw new IllegalArgumentException("COD rider mock merchant settlement is missing");
            }
            if (!cod && !paid) {
                throw new IllegalStateException("QR customer has not completed real prepayment");
            }
            change(order, "COMPLETED", "Giao hàng thành công (mô phỏng)", false);
            publisher.publishSimulatedDeliveryCompleted(order, items.findByOrderIdOrderByIdAsc(orderId), paid);
        } else if ("shipping.resolved".equals(event.eventType())) {
            if (!"CLOSED_UNDELIVERABLE".equals(payload.path("resolution").asText())) {
                return; // Return and retry never finish the order.
            }
            change(order, "DELIVERY_FAILED", "Đã đóng xử lý giao hàng thất bại");
        }
    }

    private void change(Order order, String target, String reason) {
        change(order, target, reason, true);
    }

    private void change(Order order, String target, String reason, boolean publishStatusChange) {
        String from = order.getStatus();
        if (from.equals(target)) return;
        order.setStatus(target);
        orders.saveAndFlush(order);
        OrderStatusHistory row = new OrderStatusHistory();
        row.setOrderId(order.getId());
        row.setFromStatus(from);
        row.setToStatus(target);
        row.setChangedRole("SHIPPING_SIMULATOR");
        row.setReason(reason);
        row.setCreatedAt(Instant.now());
        history.save(row);
        if (publishStatusChange) publisher.publishOrderStatusChanged(order,
                items.findByOrderIdOrderByIdAsc(order.getId()), from);
    }
}
