package com.clucky.catalogstoreservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public class ComboDto {

    public static class ItemDto {
        private Long productId;
        private String productName;
        private Integer quantity = 1;
        private Long optionId;

        public ItemDto() {}

        public ItemDto(Long productId, String productName, Integer quantity, Long optionId) {
            this.productId = productId;
            this.productName = productName;
            this.quantity = quantity != null ? quantity : 1;
            this.optionId = optionId;
        }

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }

        public Long getOptionId() { return optionId; }
        public void setOptionId(Long optionId) { this.optionId = optionId; }
    }

    public static class Response {
        private Long id;
        private String name;
        private String slug;
        private String description;
        private BigDecimal comboPrice;
        private String imageUrl;
        private String imagePublicId;
        private String startAt;
        private String endAt;
        private Boolean isActive;
        private List<ItemDto> items = new ArrayList<>();

        public Response() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public BigDecimal getComboPrice() { return comboPrice; }
        public void setComboPrice(BigDecimal comboPrice) { this.comboPrice = comboPrice; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

        public String getImagePublicId() { return imagePublicId; }
        public void setImagePublicId(String imagePublicId) { this.imagePublicId = imagePublicId; }

        public String getStartAt() { return startAt; }
        public void setStartAt(String startAt) { this.startAt = startAt; }

        public String getEndAt() { return endAt; }
        public void setEndAt(String endAt) { this.endAt = endAt; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean isActive) { this.isActive = isActive; }

        public List<ItemDto> getItems() { return items; }
        public void setItems(List<ItemDto> items) { this.items = items; }
    }

    public static class Request {
        @NotBlank(message = "Tên combo không được để trống")
        private String name;

        @NotBlank(message = "Mô tả không được để trống")
        private String description;

        @NotNull(message = "Giá combo không được để trống")
        private BigDecimal comboPrice;

        private String imageUrl;
        private String imagePublicId;
        private OffsetDateTime startAt;
        private OffsetDateTime endAt;
        private Boolean isActive = true;
        private List<ItemDto> items = new ArrayList<>();

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public BigDecimal getComboPrice() { return comboPrice; }
        public void setComboPrice(BigDecimal comboPrice) { this.comboPrice = comboPrice; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

        public String getImagePublicId() { return imagePublicId; }
        public void setImagePublicId(String imagePublicId) { this.imagePublicId = imagePublicId; }

        public OffsetDateTime getStartAt() { return startAt; }
        public void setStartAt(OffsetDateTime startAt) { this.startAt = startAt; }

        public OffsetDateTime getEndAt() { return endAt; }
        public void setEndAt(OffsetDateTime endAt) { this.endAt = endAt; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean isActive) { this.isActive = isActive; }

        public List<ItemDto> getItems() { return items; }
        public void setItems(List<ItemDto> items) { this.items = items; }
    }
}
