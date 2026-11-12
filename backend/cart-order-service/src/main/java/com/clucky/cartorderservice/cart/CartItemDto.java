package com.clucky.cartorderservice.cart;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import org.springframework.util.DigestUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CartItemDto {
    private String itemKey;
    private Long productId;
    private Long comboId;
    private String itemName;

    @Min(value = 1, message = "Quantity must be greater than 0")
    private Integer quantity = 1;

    private BigDecimal unitPrice = BigDecimal.ZERO;
    private List<Long> optionIds = new ArrayList<>();
    private List<Long> toppingIds = new ArrayList<>();
    private Object optionsSnapshot;
    private Object toppingsSnapshot;
    private String note;
    private Long storeId;
    private BigDecimal lineTotal;

    public CartItemDto() {}

    public CartItemDto(Long productId, Long comboId, String itemName, Integer quantity,
                       BigDecimal unitPrice, List<Long> optionIds, List<Long> toppingIds,
                       String note, Long storeId) {
        this.productId = productId;
        this.comboId = comboId;
        this.itemName = itemName;
        this.quantity = quantity != null ? quantity : 1;
        this.unitPrice = unitPrice != null ? unitPrice : BigDecimal.ZERO;
        this.optionIds = optionIds != null ? optionIds : new ArrayList<>();
        this.toppingIds = toppingIds != null ? toppingIds : new ArrayList<>();
        this.note = note;
        this.storeId = storeId;
        this.itemKey = generateItemKey();
        this.lineTotal = calculateLineTotal();
    }

    @AssertTrue(message = "Either productId or comboId must be provided, but not both")
    public boolean isValidItemType() {
        return (productId == null) != (comboId == null);
    }

    public String generateItemKey() {
        String type = productId != null ? "P:" + productId : "C:" + comboId;
        List<Long> sortedOpts = optionIds == null ? List.of() :
                optionIds.stream().filter(Objects::nonNull).sorted().toList();
        List<Long> sortedTops = toppingIds == null ? List.of() :
                toppingIds.stream().filter(Objects::nonNull).sorted().toList();
        String raw = type + "|opt:" + sortedOpts + "|top:" + sortedTops;
        return DigestUtils.md5DigestAsHex(raw.getBytes(StandardCharsets.UTF_8));
    }

    public BigDecimal calculateLineTotal() {
        if (unitPrice != null && quantity != null) {
            return unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
        return BigDecimal.ZERO;
    }

    public String getItemKey() {
        if (itemKey == null || itemKey.isBlank()) {
            itemKey = generateItemKey();
        }
        return itemKey;
    }

    public void setItemKey(String itemKey) {
        this.itemKey = itemKey;
    }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Long getComboId() { return comboId; }
    public void setComboId(Long comboId) { this.comboId = comboId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
        this.lineTotal = calculateLineTotal();
    }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
        this.lineTotal = calculateLineTotal();
    }

    public List<Long> getOptionIds() { return optionIds; }
    public void setOptionIds(List<Long> optionIds) { this.optionIds = optionIds != null ? optionIds : new ArrayList<>(); }

    public List<Long> getToppingIds() { return toppingIds; }
    public void setToppingIds(List<Long> toppingIds) { this.toppingIds = toppingIds != null ? toppingIds : new ArrayList<>(); }

    public Object getOptionsSnapshot() { return optionsSnapshot; }
    public void setOptionsSnapshot(Object optionsSnapshot) { this.optionsSnapshot = optionsSnapshot; }

    public Object getToppingsSnapshot() { return toppingsSnapshot; }
    public void setToppingsSnapshot(Object toppingsSnapshot) { this.toppingsSnapshot = toppingsSnapshot; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public BigDecimal getLineTotal() {
        if (lineTotal == null) {
            lineTotal = calculateLineTotal();
        }
        return lineTotal;
    }

    public void setLineTotal(BigDecimal lineTotal) {
        this.lineTotal = lineTotal;
    }
}
