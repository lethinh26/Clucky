package com.clucky.shippingservice.service;

import com.clucky.shippingservice.config.AccessGuard;
import com.clucky.shippingservice.config.CurrentActor;
import com.clucky.shippingservice.dto.DomainEvent;
import com.clucky.shippingservice.dto.Role;
import com.clucky.shippingservice.dto.ShipmentResponse;
import com.clucky.shippingservice.mapper.DomainMapper;
import com.clucky.shippingservice.repository.ShipmentRepository;
import com.clucky.shippingservice.exception.ApiException;
import com.clucky.shippingservice.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShipmentServiceTemplate {
    private final ShipmentRepository repository;
    private final AccessGuard access;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ShipmentServiceTemplate(ShipmentRepository repository, AccessGuard access, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.repository = repository;
        this.access = access;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public ShipmentResponse get(Long orderId) {
        CurrentActor actor = CurrentActor.require();
        var shipment = repository.findByOrderId(orderId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (actor.role() == Role.CUSTOMER) access.requireOwner(shipment.getCustomerId());
        else access.requireStore(shipment.getStoreId());
        return DomainMapper.toResponse(shipment);
    }

    @Transactional
    public void createFromOrder(DomainEvent event) {
        if (event == null || !"order.created".equals(event.eventType()) || !"cart-order-service".equals(event.sourceService())
                || event.eventId() == null || event.eventId().isBlank() || event.eventId().length() > 160) {
            throw new IllegalArgumentException("Invalid shipment event source or identity");
        }
        if ("COUNTER".equals(event.payload().path("orderSource").asText())
                && !event.payload().hasNonNull("customerId")) return;
        OrderSnapshot order = snapshot(event.payload());
        String fingerprint = fingerprint(order);
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class, "shipment-order:" + order.orderId());
        var known = jdbc.queryForList("SELECT order_id,fingerprint FROM shipping_service.order_created_receipts WHERE event_id=? OR order_id=?",
                event.eventId(), order.orderId());
        for (var receipt : known) requireSame(receipt, order.orderId(), fingerprint);
        int inserted = jdbc.update("INSERT INTO shipping_service.order_created_receipts(event_id,order_id,fingerprint,correlation_id) VALUES (?,?,?,?) "
                + "ON CONFLICT(event_id) DO NOTHING", event.eventId(), order.orderId(), fingerprint, event.correlationId());
        if (inserted == 0) {
            requireSame(jdbc.queryForMap("SELECT order_id,fingerprint FROM shipping_service.order_created_receipts WHERE event_id=?",
                    event.eventId()), order.orderId(), fingerprint);
            return;
        }
        if (!known.isEmpty() || "PICKUP".equals(order.type())) return;
        var shipmentIds = jdbc.queryForList("INSERT INTO shipping_service.shipments(order_id,customer_id,store_id,source_event_id,"
                + "customer_name,phone,address,fee,cod_amount,latitude,longitude,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'CREATED') "
                + "ON CONFLICT(order_id) DO NOTHING RETURNING id", Long.class,
                order.orderId(), order.customerId(), order.storeId(), event.eventId(), order.receiverName(), order.receiverPhone(),
                order.address(), order.fee(), "COD".equals(order.paymentMethod()) ? order.total() : BigDecimal.ZERO,
                order.latitude(), order.longitude());
        if (shipmentIds.isEmpty()) throw new IllegalArgumentException("Existing shipment requires reconciliation");
        jdbc.update("INSERT INTO shipping_service.shipment_status_history(shipment_id,status,note) VALUES (?,'CREATED','ORDER_CREATED')",
                shipmentIds.getFirst());
    }

    private void requireSame(Map<String, Object> receipt, long orderId, String fingerprint) {
        if (!Long.valueOf(orderId).equals(receipt.get("order_id")) || !fingerprint.equals(receipt.get("fingerprint"))) {
            throw new IllegalArgumentException("Conflicting shipment event snapshot");
        }
    }

    private String fingerprint(OrderSnapshot order) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(mapper.writeValueAsString(order).getBytes(StandardCharsets.UTF_8)));
        } catch (JsonProcessingException | NoSuchAlgorithmException failure) {
            throw new IllegalStateException("Cannot fingerprint shipment snapshot");
        }
    }

    record OrderSnapshot(long orderId, long customerId, long storeId, String type, String receiverName,
            String receiverPhone, String address, BigDecimal fee, String paymentMethod, BigDecimal total,
            Double latitude, Double longitude) {
        @Override public String toString() { return "OrderSnapshot[redacted]"; }
    }

    static OrderSnapshot snapshot(JsonNode payload) {
        if (payload == null || !payload.isObject()) throw new IllegalArgumentException("Invalid shipment payload");
        long orderId = identity(payload, "orderId");
        long customerId = identity(payload, "customerId");
        long storeId = identity(payload, "storeId");
        String type = text(payload, "type", 20);
        if ("PICKUP".equals(type)) {
            if (payload.hasNonNull("shippingFee") && money(payload, "shippingFee").signum() != 0) {
                throw new IllegalArgumentException("Invalid pickup fee");
            }
            return new OrderSnapshot(orderId, customerId, storeId, type, null, null, null, BigDecimal.ZERO, null, BigDecimal.ZERO, null, null);
        }
        if (!"DELIVERY".equals(type)) throw new IllegalArgumentException("Invalid order type");
        String method = text(payload, "paymentMethod", 30);
        if (!Set.of("COD", "BANK_TRANSFER").contains(method)) throw new IllegalArgumentException("Invalid shipment payment method");
        Double latitude = coordinate(payload, "latitude", 90);
        Double longitude = coordinate(payload, "longitude", 180);
        if ((latitude == null) != (longitude == null)) throw new IllegalArgumentException("Incomplete shipment location");
        return new OrderSnapshot(orderId, customerId, storeId, type, text(payload, "receiverName", 160),
                text(payload, "receiverPhone", 30), text(payload, "deliveryAddress", Integer.MAX_VALUE), money(payload, "shippingFee"), method,
                money(payload, "totalAmount"), latitude, longitude);
    }

    private static long identity(JsonNode payload, String field) {
        JsonNode value = payload.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("Invalid shipment identity");
        }
        return value.longValue();
    }

    private static String text(JsonNode payload, String field, int maximum) {
        JsonNode value = payload.path(field);
        if (!value.isTextual() || value.textValue().isBlank() || value.textValue().length() > maximum
                || value.textValue().indexOf('\0') >= 0) throw new IllegalArgumentException("Invalid shipment text");
        return value.textValue();
    }

    private static BigDecimal money(JsonNode payload, String field) {
        JsonNode value = payload.path(field);
        if (!value.isNumber() || value.decimalValue().signum() < 0 || value.decimalValue().stripTrailingZeros().scale() > 0
                || value.decimalValue().compareTo(new BigDecimal("999999999999")) > 0) {
            throw new IllegalArgumentException("Invalid shipment amount");
        }
        return value.decimalValue().setScale(0, RoundingMode.UNNECESSARY);
    }

    private static Double coordinate(JsonNode payload, String field, int maximum) {
        JsonNode value = payload.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isNumber() || !Double.isFinite(value.doubleValue()) || Math.abs(value.doubleValue()) > maximum) {
            throw new IllegalArgumentException("Invalid shipment location");
        }
        return value.doubleValue() == 0 ? 0.0 : value.doubleValue();
    }
}
