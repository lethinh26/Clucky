package com.clucky.cartorderservice.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;

@Service
public class RefundEvidenceService {
    private static final Logger LOG = LoggerFactory.getLogger(RefundEvidenceService.class);

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final CloudinaryProperties properties;
    private final Cloudinary cloudinary;

    public RefundEvidenceService(CloudinaryProperties properties) {
        this.properties = properties;
        if (properties.isEnabled() && properties.getCloudName() != null && !properties.getCloudName().isBlank()
                && properties.getApiKey() != null && !properties.getApiKey().isBlank()
                && properties.getApiSecret() != null && !properties.getApiSecret().isBlank()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", properties.getCloudName(),
                    "api_key", properties.getApiKey(),
                    "api_secret", properties.getApiSecret(),
                    "secure", true
            ));
            LOG.info("RefundEvidenceService initialized with Cloudinary cloud: {}", properties.getCloudName());
        } else {
            this.cloudinary = null;
            LOG.info("RefundEvidenceService initialized in FAIL-CLOSED mode (Cloudinary disabled or credentials missing)");
        }
    }

    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        try {
            byte[] bytes = file.getBytes();
            boolean jpeg = bytes.length >= 3 && (bytes[0] & 0xff) == 0xff
                    && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff;
            boolean png = bytes.length >= 8 && Arrays.equals(Arrays.copyOf(bytes, 8),
                    new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
            boolean webp = bytes.length >= 12 && new String(bytes, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF")
                    && new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            if (!("image/jpeg".equalsIgnoreCase(contentType) && jpeg
                    || "image/png".equalsIgnoreCase(contentType) && png
                    || "image/webp".equalsIgnoreCase(contentType) && webp)) {
                throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
            }
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    public record UploadResult(String publicId, String secureUrl) {}

    public UploadResult uploadEvidence(Long storeId, Long refundRequestId, String attemptId, MultipartFile file) {
        validateFile(file);

        if (cloudinary == null || !properties.isEnabled()) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, "Kho bằng chứng chưa được cấu hình");
        }

        try {
            String folder = properties.getFolder() + "/refunds/" + storeId + "/" + refundRequestId;
            Map<String, Object> params = ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "image",
                    "type", "authenticated",
                    "overwrite", true
            );

            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), params);
            String publicId = (String) result.get("public_id");
            String secureUrl = (String) result.get("secure_url");
            if (publicId == null || publicId.isBlank() || secureUrl == null || secureUrl.isBlank()) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }

            LOG.info("event=refund_evidence_uploaded refundRequestId={} attemptId={} publicId={}",
                    refundRequestId, attemptId, publicId);

            return new UploadResult(publicId, secureUrl);
        } catch (IOException ex) {
            LOG.error("event=refund_evidence_upload_failed refundRequestId={} error={}", refundRequestId, ex.getMessage());
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public String generatePrivateDeliveryUrl(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        if (cloudinary == null || !properties.isEnabled()) {
            throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE);
        }

        try {
            // Cloudinary download signature includes expires_at; a delivery URL
            // generated with signed(true) alone has no expiry.
            long expiresAt = (System.currentTimeMillis() / 1000L) + 600L;
            return cloudinary.privateDownload(publicId, null, ObjectUtils.asMap(
                    "type", "authenticated", "expires_at", expiresAt, "attachment", false));
        } catch (Exception ex) {
            LOG.error("event=refund_evidence_signing_failed publicId={} error={}", publicId, ex.getMessage());
            throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE);
        }
    }
}

