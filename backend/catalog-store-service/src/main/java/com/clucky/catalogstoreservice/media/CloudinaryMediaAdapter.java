package com.clucky.catalogstoreservice.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.clucky.catalogstoreservice.dto.MediaDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Component
public class CloudinaryMediaAdapter {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryMediaAdapter.class);
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final CloudinaryProperties properties;
    private final Cloudinary cloudinary;

    public CloudinaryMediaAdapter(CloudinaryProperties properties) {
        this.properties = properties;
        if (properties.isEnabled() && properties.getCloudName() != null && !properties.getCloudName().isBlank()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", properties.getCloudName(),
                    "api_key", properties.getApiKey(),
                    "api_secret", properties.getApiSecret(),
                    "secure", true
            ));
            log.info("CloudinaryMediaAdapter initialized with cloud_name: {}", properties.getCloudName());
        } else {
            this.cloudinary = null;
            log.info("CloudinaryMediaAdapter running in fallback mode (CLOUDINARY_ENABLED=false or credentials missing)");
        }
    }

    public void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File ảnh không được để trống!");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Dung lượng ảnh tối đa là 5MB! Dung lượng file tải lên: " + (file.getSize() / 1024 / 1024) + "MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Định dạng file không hợp lệ! Chỉ chấp nhận PNG, JPEG, JPG, WEBP.");
        }
    }

    public MediaDto.UploadResponse uploadImage(MultipartFile file, String subfolder) {
        validateImageFile(file);

        if (cloudinary == null || !properties.isEnabled()) {
            // Graceful fallback for local development without real Cloudinary credentials
            String publicId = (properties.getFolder() != null ? properties.getFolder() : "clucky")
                    + "/" + subfolder + "/mock-" + UUID.randomUUID();
            String fallbackUrl = "https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=800";
            log.info("Cloudinary disabled; generated fallback media asset: {}", publicId);
            return new MediaDto.UploadResponse(fallbackUrl, publicId, "jpg", file.getSize(), 800, 600);
        }

        try {
            String targetFolder = (properties.getFolder() != null ? properties.getFolder() : "clucky") + "/" + subfolder;
            Map<String, Object> params = ObjectUtils.asMap(
                    "folder", targetFolder,
                    "resource_type", "image",
                    "overwrite", true
            );

            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            String secureUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");
            String format = (String) uploadResult.get("format");
            Number bytes = (Number) uploadResult.get("bytes");
            Number width = (Number) uploadResult.get("width");
            Number height = (Number) uploadResult.get("height");

            log.info("Cloudinary upload successful for publicId: {}", publicId);
            return new MediaDto.UploadResponse(
                    secureUrl,
                    publicId,
                    format,
                    bytes != null ? bytes.longValue() : file.getSize(),
                    width != null ? width.intValue() : 0,
                    height != null ? height.intValue() : 0
            );
        } catch (IOException ex) {
            log.error("Cloudinary upload failed: {}", ex.getMessage());
            throw new RuntimeException("Tải ảnh lên dịch vụ lưu trữ thất bại. Vui lòng thử lại sau.", ex);
        }
    }

    /**
     * Delete asset immediately.
     */
    public boolean deleteAsset(String publicId) {
        if (publicId == null || publicId.isBlank() || publicId.contains("mock-") || publicId.startsWith("http")) {
            return true;
        }
        if (cloudinary == null || !properties.isEnabled()) {
            log.info("Cloudinary disabled; skipped deleting asset: {}", publicId);
            return true;
        }

        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Cloudinary asset deleted: {} (result: {})", publicId, result.get("result"));
            return true;
        } catch (Exception ex) {
            log.warn("Failed to delete Cloudinary asset {}: {}", publicId, ex.getMessage());
            return false;
        }
    }

    /**
     * INT-04: Replace asset safely. Deletes old asset only after the database transaction commits.
     */
    public void deleteOldAssetAfterCommit(String oldPublicId) {
        if (oldPublicId == null || oldPublicId.isBlank() || oldPublicId.contains("mock-") || oldPublicId.startsWith("http")) {
            return;
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    log.info("Transaction committed successfully, executing deletion of old asset: {}", oldPublicId);
                    deleteAsset(oldPublicId);
                }
            });
        } else {
            deleteAsset(oldPublicId);
        }
    }
}
