package com.clucky.promotionloyaltyservice.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.clucky.promotionloyaltyservice.config.CloudinaryProperties;
import com.clucky.promotionloyaltyservice.dto.BannerUploadResult;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
public class CloudinaryBannerMediaAdapter {
    public static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 16_000_000L;
    private static final Set<String> ALLOWED_MIMES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_FORMATS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Logger LOG = LoggerFactory.getLogger(CloudinaryBannerMediaAdapter.class);

    private final CloudinaryProperties properties;
    private final Cloudinary cloudinary;
    private final BannerMediaAssets assets;
    private final ExecutorService cleanupExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "banner-media-cleanup");
        thread.setDaemon(true);
        return thread;
    });

    public CloudinaryBannerMediaAdapter(CloudinaryProperties properties, BannerMediaAssets assets) {
        this.properties = properties;
        this.assets = assets;
        this.cloudinary = properties.enabled()
                ? new Cloudinary(ObjectUtils.asMap(
                        "cloud_name", properties.cloudName(),
                        "api_key", properties.apiKey(),
                        "api_secret", properties.apiSecret(),
                        "secure", true))
                : null;
    }

    @PreDestroy
    void shutdown() {
        cleanupExecutor.shutdown();
    }

    public static void requireUnchangedImage(String url, String publicId, String currentUrl, String currentId) {
        if ((url != null && !Objects.equals(url, currentUrl))
                || (publicId != null && !Objects.equals(publicId, currentId))) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    public void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        }
        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_MIMES.contains(mime)) {
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        String filename = file.getOriginalFilename();
        int dotIndex = filename == null ? -1 : filename.lastIndexOf('.');
        String extension = dotIndex >= 0 ? filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT) : "";
        if (!(mime.equals("image/jpeg") && Set.of("jpg", "jpeg").contains(extension))
                && !mime.equals("image/" + extension)) {
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        try {
            byte[] content = file.getBytes();
            if (content.length == 0 || content.length > MAX_FILE_SIZE) {
                if (content.length > MAX_FILE_SIZE) {
                    throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
                }
                throw new IOException();
            }
            try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(content))) {
                if (stream == null) throw new IOException();
                var readers = ImageIO.getImageReaders(stream);
                if (!readers.hasNext()) throw new IOException();
                var reader = readers.next();
                try {
                    reader.setInput(stream);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    String normalizedFormat = "jpg".equals(format) ? "jpeg" : format;
                    if (!mime.equals("image/" + normalizedFormat)) {
                        throw new IOException();
                    }
                    validateDimensions(reader.getWidth(0), reader.getHeight(0));
                    if (reader.read(0) == null) {
                        throw new IOException();
                    }
                } finally {
                    reader.dispose();
                }
            }
        } catch (ApiException failure) {
            throw failure;
        } catch (IOException | RuntimeException failure) {
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    private static void validateDimensions(int width, int height) throws IOException {
        if (width <= 0 || height <= 0 || (long) width * height > MAX_PIXELS) {
            throw new IOException();
        }
    }

    public BannerUploadResult uploadBannerImage(MultipartFile file) {
        validateImageFile(file);
        if (cloudinary == null) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        String publicId = properties.folder() + "/banners/" + UUID.randomUUID();
        assets.reserve(publicId);
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("public_id", publicId, "resource_type", "image", "overwrite", false));
            if (result == null) {
                throw new IllegalArgumentException();
            }
            String url = metadataText(result.get("secure_url"), 2048);
            URI location = URI.create(url);
            if (!"https".equals(location.getScheme())
                    || !"res.cloudinary.com".equals(location.getHost())
                    || location.getRawUserInfo() != null
                    || location.getRawQuery() != null
                    || location.getRawFragment() != null
                    || !location.getPath().startsWith("/" + properties.cloudName() + "/image/upload/")
                    || !publicId.equals(metadataText(result.get("public_id"), 255))) {
                throw new IllegalArgumentException();
            }
            String format = metadataText(result.get("format"), 20).toLowerCase(Locale.ROOT);
            if (!ALLOWED_FORMATS.contains(format)) {
                throw new IllegalArgumentException();
            }
            if (!location.getPath().endsWith("/" + publicId + "." + format)) {
                throw new IllegalArgumentException();
            }
            BannerUploadResult uploaded = new BannerUploadResult(
                    url,
                    publicId,
                    format,
                    metadataNumber(result.get("bytes"), MAX_FILE_SIZE),
                    (int) metadataNumber(result.get("width"), MAX_PIXELS),
                    (int) metadataNumber(result.get("height"), MAX_PIXELS));
            validateDimensions(uploaded.width(), uploaded.height());
            assets.uploaded(publicId, url);
            assets.attach(publicId);
            return uploaded;
        } catch (ApiException failure) {
            safeRetireOrphan(publicId);
            throw failure;
        } catch (IOException | RuntimeException failure) {
            safeRetireOrphan(publicId);
            LOG.warn("event=banner_media_upload_failed");
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    private static String metadataText(Object value, int limit) {
        if (!(value instanceof String text) || text.isBlank() || text.length() > limit
                || !text.equals(text.strip())
                || text.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException();
        }
        return text;
    }

    private static long metadataNumber(Object value, long maximum) {
        if (!(value instanceof Number number)) {
            throw new IllegalArgumentException();
        }
        long result = new BigDecimal(number.toString()).longValueExact();
        if (result <= 0 || result > maximum) {
            throw new IllegalArgumentException();
        }
        return result;
    }

    public boolean isOwnedBannerPublicId(String publicId) {
        String folder = properties.folder();
        return folder != null && !folder.isBlank()
                && publicId != null && !publicId.isBlank()
                && publicId.length() <= 255
                && publicId.startsWith(folder + "/banners/");
    }

    public void destroyOwned(String publicId) {
        if (cloudinary == null) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (!isOwnedBannerPublicId(publicId)) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        try {
            var result = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", "image", "invalidate", true));
            if (result == null || !("ok".equals(result.get("result")) || "not found".equals(result.get("result")))) {
                throw new IOException();
            }
        } catch (IOException | RuntimeException failure) {
            LOG.warn("event=banner_media_destroy_failed");
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    public void deleteOldAssetAfterCommit(String publicId) {
        if (!isOwnedBannerPublicId(publicId)) {
            return;
        }
        assets.retire(publicId);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    scheduleCleanupNow();
                }
            });
        }
    }

    public void retireOrphan(String publicId) {
        safeRetireOrphan(publicId);
        scheduleCleanupNow();
    }

    private void safeRetireOrphan(String publicId) {
        if (!isOwnedBannerPublicId(publicId)) {
            return;
        }
        try {
            assets.retireOrphan(publicId);
        } catch (RuntimeException failure) {
            LOG.warn("event=banner_media_orphan_mark_failed");
        }
    }

    private void scheduleCleanupNow() {
        if (cloudinary == null) {
            return;
        }
        try {
            cleanupExecutor.execute(this::recoverOrphans);
        } catch (RuntimeException ignored) {
            // Scheduled job recovers pending assets on the next tick.
        }
    }

    @Scheduled(fixedDelay = 60000)
    public void recoverOrphans() {
        if (cloudinary != null) {
            assets.cleanPending(this);
        }
    }
}

