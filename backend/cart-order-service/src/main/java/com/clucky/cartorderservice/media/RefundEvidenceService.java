package com.clucky.cartorderservice.media;

import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;

@Service
public class RefundEvidenceService {
    private static final Logger LOG = LoggerFactory.getLogger(RefundEvidenceService.class);

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of("image/jpeg", "image/png");

    private final CloudinaryProperties properties;
    private final Cloudinary cloudinary;

    public RefundEvidenceService(CloudinaryProperties properties) {
        this.properties = properties;
        if (properties.isEnabled() && properties.getCloudName() != null && !properties.getCloudName().isBlank()
                && properties.getApiKey() != null && !properties.getApiKey().isBlank()
                && properties.getApiSecret() != null && !properties.getApiSecret().isBlank()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap("cloud_name", properties.getCloudName(),
                    "api_key", properties.getApiKey(), "api_secret", properties.getApiSecret(), "secure", true));
            LOG.info("RefundEvidenceService initialized with Cloudinary cloud: {}", properties.getCloudName());
        } else {
            this.cloudinary = null;
            LOG.info("RefundEvidenceService initialized in FAIL-CLOSED mode (Cloudinary disabled or credentials missing)");
        }
    }

    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (file.getSize() > MAX_FILE_SIZE) throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase(java.util.Locale.ROOT)))
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Refund evidence supports JPEG and PNG only (maximum 5 MiB).");
        verifiedImage(file);
    }

    private byte[] verifiedImage(MultipartFile file) {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
            var reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
                if (!Set.of("jpeg", "png").contains(format) || !file.getContentType().equalsIgnoreCase("image/" + format)) throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels <= 0 || pixels > 20_000_000) throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
                var output = new ByteArrayOutputStream();
                if (!ImageIO.write(reader.read(0), "png", output)) throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
                if (output.size() > MAX_FILE_SIZE) throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
                return output.toByteArray();
            } finally { reader.dispose(); }
        } catch (ApiException failure) { throw failure;
        } catch (IOException | RuntimeException failure) { throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE); }
    }

    private void requireProvider() {
        if (cloudinary == null || !properties.isEnabled()) throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE);
    }

    public record UploadResult(String publicId, String secureUrl) {}

    public UploadResult uploadEvidence(Long storeId, Long refundRequestId, String attemptId, MultipartFile file) {
        validateFile(file);
        requireProvider();
        if (attemptId == null || attemptId.isBlank()) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);

        try {
            String expectedId = properties.getFolder() + "/refunds/" + storeId + "/" + refundRequestId + "/" + attemptId + "/" + UUID.randomUUID();
            Map<String, Object> params = ObjectUtils.asMap("public_id", expectedId, "resource_type", "image", "type", "authenticated", "overwrite", false);
            Map<?, ?> result = cloudinary.uploader().upload(verifiedImage(file), params);
            String publicId = (String) result.get("public_id");
            if (!expectedId.equals(publicId) || !"authenticated".equals(result.get("type")) || !"image".equals(result.get("resource_type")) || !"png".equals(result.get("format"))) throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE);
            LOG.info("event=refund_evidence_uploaded refundRequestId={} attemptId={} publicId={}", refundRequestId, attemptId, publicId);
            return new UploadResult(publicId, null);
        } catch (Exception ex) {
            LOG.warn("event=refund_evidence_upload_failed refundRequestId={}", refundRequestId);
            throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE);
        }
    }

    public void verifyEvidence(String publicId, Long storeId, Long refundId, String attemptId) {
        String prefix = properties.getFolder() + "/refunds/" + storeId + "/" + refundId + "/" + attemptId + "/";
        if (attemptId == null || publicId == null || !publicId.startsWith(prefix)) throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        verifyResource(publicId);
    }

    private void verifyResource(String publicId) {
        requireProvider();
        if (publicId == null || !publicId.startsWith(properties.getFolder() + "/refunds/")) throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        try {
            Map<?, ?> resource = cloudinary.api().resource(publicId, ObjectUtils.asMap("resource_type", "image", "type", "authenticated"));
            if (!publicId.equals(resource.get("public_id")) || !"authenticated".equals(resource.get("type")) || !"image".equals(resource.get("resource_type")) || !"png".equals(resource.get("format"))) throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        } catch (ApiException failure) { throw failure;
        } catch (Exception failure) { throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE); }
    }

    public String generatePrivateDeliveryUrl(String publicId) {
        if (publicId == null || publicId.isBlank()) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        verifyResource(publicId);
        try {
            long expiresAt = (System.currentTimeMillis() / 1000L) + 600L;
            return cloudinary.privateDownload(publicId, "png", ObjectUtils.asMap("resource_type", "image", "type", "authenticated", "expires_at", expiresAt));
        } catch (Exception ex) {
            LOG.warn("event=refund_evidence_signing_failed");
            throw new ApiException(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE);
        }
    }
}
