package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.DomainEvent;
import com.clucky.catalogstoreservice.repository.ComboItemRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.util.Map;
import java.util.TreeMap;

@Service
public class OrderStockService {
    private final JdbcTemplate jdbc;
    private final InventoryService inventory;
    private final ComboItemRepository combos;
    private final ObjectMapper mapper;

    public OrderStockService(JdbcTemplate jdbc, InventoryService inventory, ComboItemRepository combos, ObjectMapper mapper) {
        this.jdbc = jdbc; this.inventory = inventory; this.combos = combos; this.mapper = mapper;
    }

    @Transactional
    public void apply(DomainEvent event) {
        if (!"cart-order-service".equals(event.sourceService()) || !java.util.Set.of("order.created", "order.cancelled").contains(event.eventType()))
            throw new IllegalArgumentException("Invalid inventory event source or type");
        long orderId = positiveId(event.payload(), "orderId");
        long storeId = positiveId(event.payload(), "storeId");
        Timestamp started = jdbc.queryForObject("SELECT started_at FROM catalog_service.inventory_projection_start WHERE id=TRUE", Timestamp.class);
        if (event.occurredAt().isBefore(started.toInstant())) return;
        jdbc.update("INSERT INTO catalog_service.order_stock_ledger(order_id,store_id,status,event_id,correlation_id) VALUES (?,?,'PENDING',?,?) ON CONFLICT DO NOTHING",
                orderId, storeId, event.eventId(), event.correlationId());
        Map<String, Object> ledger = jdbc.queryForMap("SELECT store_id,status,quantities::text FROM catalog_service.order_stock_ledger WHERE order_id=? FOR UPDATE", orderId);
        if (((Number) ledger.get("store_id")).longValue() != storeId) throw new IllegalArgumentException("Inventory store mismatch");
        String status = ledger.get("status").toString();
        if ("CANCELLED".equals(status)) return;
        boolean cancelled = "order.cancelled".equals(event.eventType());
        Map<Long, Integer> quantities = new TreeMap<>();
        if (cancelled && "DEDUCTED".equals(status)) {
            try {
                var fields = mapper.readTree(ledger.get("quantities").toString()).fields();
                while (fields.hasNext()) {
                    var entry = fields.next();
                    quantities.put(Long.parseLong(entry.getKey()), entry.getValue().intValue());
                }
            } catch (java.io.IOException failure) { throw new IllegalStateException("Invalid stock ledger", failure); }
        } else if (!cancelled) {
            if ("DEDUCTED".equals(status)) return;
            if (event.payload().has("stockQuantities")) {
                JsonNode snapshot = event.payload().path("stockQuantities");
                if (!snapshot.isObject() || snapshot.isEmpty()) throw new IllegalArgumentException("Stock snapshot required");
                var fields = snapshot.fieldNames();
                while (fields.hasNext()) {
                    String product = fields.next();
                    long productId = Long.parseLong(product);
                    if (productId <= 0) throw new IllegalArgumentException("Invalid stock product");
                    quantities.put(productId, Math.toIntExact(positiveId(snapshot, product)));
                }
            } else quantities = quantities(event.payload().path("items"), combos);
        }
        for (var entry : quantities.entrySet()) inventory.changeForOrder(storeId, entry.getKey(), cancelled ? entry.getValue() : -entry.getValue());
        jdbc.update("UPDATE catalog_service.order_stock_ledger SET status=?,quantities=?::jsonb,event_id=?,correlation_id=?,updated_at=now() WHERE order_id=?",
                cancelled ? "CANCELLED" : "DEDUCTED", mapper.valueToTree(quantities).toString(), event.eventId(), event.correlationId(), orderId);
    }

    static Map<Long, Integer> quantities(JsonNode items, ComboItemRepository combos) {
        if (!items.isArray() || items.isEmpty()) throw new IllegalArgumentException("Order items required");
        Map<Long, Integer> quantities = new TreeMap<>();
        for (JsonNode item : items) {
            int quantity = Math.toIntExact(positiveId(item, "quantity"));
            if ("PRODUCT".equals(item.path("itemType").asText())) {
                quantities.merge(positiveId(item, "productId"), quantity, Math::addExact);
            } else if ("COMBO".equals(item.path("itemType").asText())) {
                var components = combos.findByComboId(positiveId(item, "comboId"));
                if (components.isEmpty()) throw new IllegalArgumentException("Combo components missing");
                for (var component : components) {
                    if (component.getQuantity() == null || component.getQuantity() <= 0) throw new IllegalArgumentException("Invalid combo quantity");
                    quantities.merge(component.getProduct().getId(), Math.multiplyExact(quantity, component.getQuantity()), Math::addExact);
                }
            } else throw new IllegalArgumentException("Invalid inventory item type");
        }
        return quantities;
    }

    private static long positiveId(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) throw new IllegalArgumentException("Invalid " + field);
        return value.longValue();
    }
}
