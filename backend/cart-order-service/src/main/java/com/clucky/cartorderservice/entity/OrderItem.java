package com.clucky.cartorderservice.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.math.BigDecimal;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "order_items", schema = "order_service")
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "item_type", nullable = false, length = 20)
    private String itemType;

    @Column(name = "product_id", nullable = true)
    private Long productId;

    @Column(name = "combo_id", nullable = true)
    private Long comboId;

    @Column(name = "item_name", nullable = false, length = 180)
    private String itemName;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal unitPrice;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options_snapshot", nullable = true, columnDefinition = "jsonb")
    private JsonNode optionsSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "toppings_snapshot", nullable = true, columnDefinition = "jsonb")
    private JsonNode toppingsSnapshot;

    @Column(name = "note", nullable = true, columnDefinition = "text")
    private String note;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 0)
    private BigDecimal lineTotal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Long getComboId() { return comboId; }
    public void setComboId(Long comboId) { this.comboId = comboId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public JsonNode getOptionsSnapshot() { return optionsSnapshot; }
    public void setOptionsSnapshot(JsonNode optionsSnapshot) { this.optionsSnapshot = optionsSnapshot; }

    public JsonNode getToppingsSnapshot() { return toppingsSnapshot; }
    public void setToppingsSnapshot(JsonNode toppingsSnapshot) { this.toppingsSnapshot = toppingsSnapshot; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
}
