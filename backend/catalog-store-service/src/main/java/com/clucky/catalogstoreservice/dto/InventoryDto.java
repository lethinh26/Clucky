package com.clucky.catalogstoreservice.dto;

import java.math.BigDecimal;

public class InventoryDto {

    public static class AvailabilityUpdateRequest {
        private Boolean isAvailable;
        private Boolean isSoldOut;
        private BigDecimal storePrice;

        public Boolean getIsAvailable() { return isAvailable; }
        public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }

        public Boolean getIsSoldOut() { return isSoldOut; }
        public void setIsSoldOut(Boolean isSoldOut) { this.isSoldOut = isSoldOut; }

        public BigDecimal getStorePrice() { return storePrice; }
        public void setStorePrice(BigDecimal storePrice) { this.storePrice = storePrice; }
    }

    public static class InventoryResponse {
        private Long storeId;
        private Long productId;
        private String productName;
        private String categoryName;
        private String imageUrl;
        private Integer quantityAvailable;
        private Integer lowStockThreshold;
        private Boolean isSoldOut;
        private String updatedAt;
        private String updatedBy;

        public InventoryResponse() {}

        public InventoryResponse(Long storeId, Long productId, String productName, String categoryName, String imageUrl, Integer quantityAvailable, Integer lowStockThreshold, Boolean isSoldOut, String updatedAt, String updatedBy) {
            this.storeId = storeId;
            this.productId = productId;
            this.productName = productName;
            this.categoryName = categoryName;
            this.imageUrl = imageUrl;
            this.quantityAvailable = quantityAvailable;
            this.lowStockThreshold = lowStockThreshold;
            this.isSoldOut = isSoldOut;
            this.updatedAt = updatedAt;
            this.updatedBy = updatedBy;
        }

        public Long getStoreId() { return storeId; }
        public void setStoreId(Long storeId) { this.storeId = storeId; }

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

        public Integer getQuantityAvailable() { return quantityAvailable; }
        public void setQuantityAvailable(Integer quantityAvailable) { this.quantityAvailable = quantityAvailable; }

        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }

        public Boolean getIsSoldOut() { return isSoldOut; }
        public void setIsSoldOut(Boolean isSoldOut) { this.isSoldOut = isSoldOut; }

        public String getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

        public String getUpdatedBy() { return updatedBy; }
        public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    }

    public static class InventoryUpdateRequest {
        private Integer quantityAvailable;
        private Integer lowStockThreshold;
        private Boolean isSoldOut;

        public Integer getQuantityAvailable() { return quantityAvailable; }
        public void setQuantityAvailable(Integer quantityAvailable) { this.quantityAvailable = quantityAvailable; }

        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }

        public Boolean getIsSoldOut() { return isSoldOut; }
        public void setIsSoldOut(Boolean isSoldOut) { this.isSoldOut = isSoldOut; }
    }
}
