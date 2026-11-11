package com.clucky.catalogstoreservice.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.clucky.catalogstoreservice.config.CloudinaryProperties;
import com.clucky.catalogstoreservice.dto.MediaDto;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
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
        if (properties.enabled()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", properties.cloudName(),
                    "api_key", properties.apiKey(),
                    "api_secret", properties.apiSecret(),
                    "secure", true
            ));
            log.info("event=media_provider_enabled");
        } else {
            this.cloudinary = null;
            log.info("event=media_provider_disabled");
        }
    }

    public void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    public MediaDto.UploadResponse uploadImage(MultipartFile file, String subfolder) {
        validateImageFile(file);

        if (cloudinary == null) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }

        try {
            String targetFolder = properties.folder() + "/" + subfolder;
            Map<String, Object> params = ObjectUtils.asMap(
                    "folder", targetFolder,
                    "resource_type", "image",
                    "overwrite", true
            );

            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            String secureUrl = metadataText(uploadResult.get("secure_url"), 2048);
            URI location = URI.create(secureUrl);
            if (!"https".equalsIgnoreCase(location.getScheme()) || location.getHost() == null
                    || location.getRawUserInfo() != null || location.getRawQuery() != null
                    || location.getRawFragment() != null || location.getRawPath().isEmpty()) {
                throw new IllegalArgumentException("Invalid media URL");
            }
            MediaDto.UploadResponse response = new MediaDto.UploadResponse(secureUrl,
                    metadataText(uploadResult.get("public_id"), 255),
                    uploadResult.get("format") == null ? null : metadataText(uploadResult.get("format"), 20),
                    metadataNumber(uploadResult.get("bytes"), file.getSize(), Long.MAX_VALUE),
                    (int) metadataNumber(uploadResult.get("width"), 0, Integer.MAX_VALUE),
                    (int) metadataNumber(uploadResult.get("height"), 0, Integer.MAX_VALUE));
            log.info("event=media_upload_succeeded");
            return response;
        } catch (IOException | RuntimeException failure) {
            log.warn("event=media_upload_failed");
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    private static String metadataText(Object value, int limit) {
        if (!(value instanceof String text) || text.isBlank() || text.length() > limit
                || !text.equals(text.strip()) || text.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Invalid media metadata");
        }
        return text;
    }

    private static long metadataNumber(Object value, long fallback, long maximum) {
        if (value == null) return fallback;
        if (!(value instanceof Number number)) throw new IllegalArgumentException("Invalid media metadata");
        long result = new BigDecimal(number.toString()).longValueExact();
        if (result <= 0 || result > maximum) throw new IllegalArgumentException("Invalid media metadata");
        return result;
    }

    /**
     * Delete asset immediately.
     */
    public boolean deleteAsset(String publicId) {
        if (publicId == null || publicId.isBlank() || publicId.contains("mock-") || publicId.startsWith("http")) {
            return true;
        }
        if (cloudinary == null) {
            log.info("event=media_delete_skipped reason=PROVIDER_DISABLED");
            return true;
        }

        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            boolean deleted = result != null && ("ok".equals(result.get("result")) || "not found".equals(result.get("result")));
            log.info("event=media_delete_completed success={}", deleted);
            return deleted;
        } catch (Exception failure) {
            log.warn("event=media_delete_failed");
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
                    log.info("event=media_cleanup_after_commit");
                    deleteAsset(oldPublicId);
                }
            });
        } else {
            deleteAsset(oldPublicId);
        }
    }
}
