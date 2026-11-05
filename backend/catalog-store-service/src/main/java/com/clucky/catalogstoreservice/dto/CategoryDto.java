package com.clucky.catalogstoreservice.dto;

import jakarta.validation.constraints.NotBlank;

public class CategoryDto {

    public static class Response {
        private Long id;
        private String name;
        private String imageUrl;
        private Integer sortOrder;
        private Boolean isActive;

        public Response() {}

        public Response(Long id, String name, String imageUrl, Integer sortOrder, Boolean isActive) {
            this.id = id;
            this.name = name;
            this.imageUrl = imageUrl;
            this.sortOrder = sortOrder;
            this.isActive = isActive;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

        public Integer getSortOrder() { return sortOrder; }
        public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    }

    public static class Request {
        @NotBlank(message = "Tên danh mục không được để trống")
        private String name;
        private String imageUrl;
        private Integer sortOrder = 0;
        private Boolean isActive = true;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

        public Integer getSortOrder() { return sortOrder; }
        public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    }
}
