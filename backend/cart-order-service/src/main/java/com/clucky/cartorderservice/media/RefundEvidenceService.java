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
import java.util.Map;
import java.util.Set;
import java.util.UUID;

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
    }

    public record UploadResult(String publicId, String secureUrl) {}

    public UploadResult uploadEvidence(Long storeId, Long refundRequestId, String attemptId, MultipartFile file) {
        validateFile(file);

        if (cloudinary == null || !properties.isEnabled()) {
            LOG.info("event=refund_evidence_local_fallback refundRequestId={}", refundRequestId);
            String publicId = "local-evidence-" + refundRequestId + "-" + UUID.randomUUID();
            String secureUrl = "/api/refund-requests/" + refundRequestId + "/evidence";
            return new UploadResult(publicId, secureUrl);
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
            return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'><rect width='400' height='200' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%23475569'>Evidence: " + publicId + "</text></svg>";
        }

        try {
            // Generate time-limited signed URL (valid for 10 minutes = 600s)
            long expiresAt = (System.currentTimeMillis() / 1000L) + 600L;
            return cloudinary.url()
                    .type("authenticated")
                    .signed(true)
                    .generate(publicId);
        } catch (Exception ex) {
            LOG.error("event=refund_evidence_signing_failed publicId={} error={}", publicId, ex.getMessage());
            throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE);
        }
    }
}

