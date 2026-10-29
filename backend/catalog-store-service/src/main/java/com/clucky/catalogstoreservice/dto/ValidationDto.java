package com.clucky.catalogstoreservice.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ValidationDto {

    public static class ValidateItemRequest {
        private Long productId;
        private Long comboId;
        private Integer quantity = 1;
        private List<Long> optionIds = new ArrayList<>();
        private List<Long> toppingIds = new ArrayList<>();

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public Long getComboId() { return comboId; }
        public void setComboId(Long comboId) { this.comboId = comboId; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }

        public List<Long> getOptionIds() { return optionIds; }
        public void setOptionIds(List<Long> optionIds) { this.optionIds = optionIds; }

        public List<Long> getToppingIds() { return toppingIds; }
        public void setToppingIds(List<Long> toppingIds) { this.toppingIds = toppingIds; }
    }

    public static class Request {
        private Long storeId;
        private List<ValidateItemRequest> items = new ArrayList<>();

        public Long getStoreId() { return storeId; }
        public void setStoreId(Long storeId) { this.storeId = storeId; }

        public List<ValidateItemRequest> getItems() { return items; }
        public void setItems(List<ValidateItemRequest> items) { this.items = items; }
    }

    public static class ValidatedItem {
        private Long productId;
        private Long comboId;
        private String name;
        private BigDecimal unitPrice;
        private BigDecimal extraPrice = BigDecimal.ZERO;
        private Integer quantity;
        private BigDecimal lineTotal;
        private boolean available = true;
        private String reason;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public Long getComboId() { return comboId; }
        public void setComboId(Long comboId) { this.comboId = comboId; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

        public BigDecimal getExtraPrice() { return extraPrice; }
        public void setExtraPrice(BigDecimal extraPrice) { this.extraPrice = extraPrice; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }

        public BigDecimal getLineTotal() { return lineTotal; }
        public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }

        public boolean isAvailable() { return available; }
        public void setAvailable(boolean available) { this.available = available; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class Response {
        private boolean valid = true;
        private boolean storeOpen = true;
        private String message;
        private BigDecimal subtotal = BigDecimal.ZERO;
        private List<ValidatedItem> items = new ArrayList<>();

        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }

        public boolean isStoreOpen() { return storeOpen; }
        public void setStoreOpen(boolean storeOpen) { this.storeOpen = storeOpen; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public BigDecimal getSubtotal() { return subtotal; }
        public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

        public List<ValidatedItem> getItems() { return items; }
        public void setItems(List<ValidatedItem> items) { this.items = items; }
    }
}
