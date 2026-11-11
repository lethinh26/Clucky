package com.clucky.catalogstoreservice.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.clucky.catalogstoreservice.config.CloudinaryProperties;
import com.clucky.catalogstoreservice.dto.MediaDto;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
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

@Component
public class CloudinaryMediaAdapter {
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private final CloudinaryProperties properties;
    private final Cloudinary cloudinary;
    private final MediaAssets assets;

    public CloudinaryMediaAdapter(CloudinaryProperties properties, MediaAssets assets) {
        this.properties = properties;
        this.assets = assets;
        this.cloudinary = properties.enabled() ? new Cloudinary(ObjectUtils.asMap("cloud_name", properties.cloudName(),
                "api_key", properties.apiKey(), "api_secret", properties.apiSecret(), "secure", true)) : null;
    }

    public static void requireUnchangedImage(String url, String publicId, String currentUrl, String currentId) {
        if ((url != null && !Objects.equals(url, currentUrl)) || (publicId != null && !Objects.equals(publicId, currentId)))
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
    }

    public void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (file.getSize() > MAX_FILE_SIZE) throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!Set.of("image/jpeg", "image/png", "image/webp").contains(mime))
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        String filename = file.getOriginalFilename();
        String extension = filename == null ? "" : filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!(mime.equals("image/jpeg") && Set.of("jpg", "jpeg").contains(extension)) && !mime.equals("image/" + extension))
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        try {
            byte[] content = file.getBytes();
            if (content.length == 0 || content.length > MAX_FILE_SIZE) throw new IOException();
            try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(content))) {
                var readers = ImageIO.getImageReaders(stream);
                if (!readers.hasNext()) throw new IOException();
                var reader = readers.next();
                try {
                    reader.setInput(stream);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!mime.equals("image/" + format)) throw new IOException();
                    validateDimensions(reader.getWidth(0), reader.getHeight(0));
                    if (reader.read(0) == null) throw new IOException();
                } finally { reader.dispose(); }
            }
        } catch (IOException | IllegalArgumentException failure) {
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    private static void validateDimensions(int width, int height) throws IOException {
        if (width <= 0 || height <= 0 || (long) width * height > 16_000_000) throw new IOException();
    }

    public MediaDto.UploadResponse uploadImage(MultipartFile file, String subfolder) {
        validateImageFile(file);
        if (cloudinary == null) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        if (!Set.of("products", "combos").contains(subfolder)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String publicId = properties.folder() + "/" + subfolder + "/" + UUID.randomUUID();
        assets.reserve(publicId);
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("public_id", publicId,
                    "resource_type", "image", "overwrite", false));
            String url = metadataText(result.get("secure_url"), 2048);
            URI location = URI.create(url);
            if (!"https".equals(location.getScheme()) || !"res.cloudinary.com".equals(location.getHost())
                    || location.getRawUserInfo() != null || location.getRawQuery() != null || location.getRawFragment() != null
                    || !location.getPath().startsWith("/" + properties.cloudName() + "/image/upload/")
                    || !publicId.equals(metadataText(result.get("public_id"), 255))) throw new IllegalArgumentException();
            String format = metadataText(result.get("format"), 20);
            if (!Set.of("jpg", "jpeg", "png", "webp").contains(format)) throw new IllegalArgumentException();
            if (!location.getPath().endsWith("/" + publicId + "." + format)) throw new IllegalArgumentException();
            var response = new MediaDto.UploadResponse(url, publicId, format,
                    metadataNumber(result.get("bytes"), MAX_FILE_SIZE), (int) metadataNumber(result.get("width"), 16_000_000),
                    (int) metadataNumber(result.get("height"), 16_000_000));
            validateDimensions(response.getWidth(), response.getHeight());
            assets.uploaded(publicId, url);
            assets.attach(publicId);
            return response;
        } catch (IOException | RuntimeException failure) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    private static String metadataText(Object value, int limit) {
        if (!(value instanceof String text) || text.isBlank() || text.length() > limit || !text.equals(text.strip())
                || text.codePoints().anyMatch(Character::isISOControl)) throw new IllegalArgumentException();
        return text;
    }

    private static long metadataNumber(Object value, long maximum) {
        if (!(value instanceof Number number)) throw new IllegalArgumentException();
        long result = new BigDecimal(number.toString()).longValueExact();
        if (result <= 0 || result > maximum) throw new IllegalArgumentException();
        return result;
    }

    public boolean deleteAsset(String publicId) {
        if (publicId == null || publicId.isBlank() || publicId.length() > 255) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        assets.delete(publicId, this);
        return true;
    }

    void destroyOwned(String publicId) {
        if (cloudinary == null) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        String prefix = properties.folder() + "/";
        if (!publicId.startsWith(prefix + "products/") && !publicId.startsWith(prefix + "combos/"))
            throw new ApiException(ErrorCode.FORBIDDEN);
        try {
            var result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image", "invalidate", true));
            if (result == null || !("ok".equals(result.get("result")) || "not found".equals(result.get("result")))) throw new IOException();
        } catch (IOException | RuntimeException failure) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    public void deleteOldAssetAfterCommit(String publicId) { assets.retire(publicId); }

    @Scheduled(fixedDelay = 60000)
    public void recoverOrphans() { if (cloudinary != null) assets.cleanPending(this); }
}
