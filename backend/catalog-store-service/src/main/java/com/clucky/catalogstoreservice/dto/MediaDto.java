package com.clucky.catalogstoreservice.dto;

public class MediaDto {

    public static class UploadResponse {
        private String secureUrl;
        private String publicId;
        private String format;
        private Long sizeBytes;
        private Integer width;
        private Integer height;

        public UploadResponse() {}

        public UploadResponse(String secureUrl, String publicId, String format, Long sizeBytes, Integer width, Integer height) {
            this.secureUrl = secureUrl;
            this.publicId = publicId;
            this.format = format;
            this.sizeBytes = sizeBytes;
            this.width = width;
            this.height = height;
        }

        public String getSecureUrl() { return secureUrl; }
        public void setSecureUrl(String secureUrl) { this.secureUrl = secureUrl; }

        public String getPublicId() { return publicId; }
        public void setPublicId(String publicId) { this.publicId = publicId; }

        public String getFormat() { return format; }
        public void setFormat(String format) { this.format = format; }

        public Long getSizeBytes() { return sizeBytes; }
        public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }

        public Integer getWidth() { return width; }
        public void setWidth(Integer width) { this.width = width; }

        public Integer getHeight() { return height; }
        public void setHeight(Integer height) { this.height = height; }
    }
}
