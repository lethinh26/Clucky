package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.config.CurrentActor;
import com.clucky.promotionloyaltyservice.dto.BannerRequest;
import com.clucky.promotionloyaltyservice.dto.BannerResponse;
import com.clucky.promotionloyaltyservice.dto.BannerUploadResult;
import com.clucky.promotionloyaltyservice.dto.Role;
import com.clucky.promotionloyaltyservice.entity.Banner;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import com.clucky.promotionloyaltyservice.media.CloudinaryBannerMediaAdapter;
import com.clucky.promotionloyaltyservice.repository.BannerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class BannerService {
    public static final Set<String> ALLOWED_POSITIONS = Set.of("HERO_HOME", "POPUP", "PROMO_STRIP");

    private final BannerRepository bannerRepository;
    private final CloudinaryBannerMediaAdapter mediaAdapter;
    private final VoucherAuditOutbox audit;
    private final TransactionTemplate transaction;
    private final TransactionTemplate readTransaction;

    public BannerService(
            BannerRepository bannerRepository,
            CloudinaryBannerMediaAdapter mediaAdapter,
            VoucherAuditOutbox audit,
            PlatformTransactionManager transactionManager) {
        this.bannerRepository = bannerRepository;
        this.mediaAdapter = mediaAdapter;
        this.audit = audit;
        this.transaction = new TransactionTemplate(transactionManager);
        this.readTransaction = new TransactionTemplate(transactionManager);
        this.readTransaction.setReadOnly(true);
    }

    @Transactional(readOnly = true)
    public List<BannerResponse> getActiveBanners(String position) {
        String normalizedPosition = normalizePosition(position, false);
        Instant now = Instant.now();
        return bannerRepository.findActiveBanners(now, normalizedPosition)
                .stream()
                .map(b -> BannerResponse.fromEntity(b, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BannerResponse> getAdminBanners(String position, Boolean isActive, String keyword) {
        requireAdmin();
        String normalizedPosition = normalizePosition(position, false);
        String cleanKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.strip();
        Instant now = Instant.now();
        return bannerRepository.findAdminBanners(normalizedPosition, isActive, cleanKeyword)
                .stream()
                .map(b -> BannerResponse.fromEntity(b, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public BannerResponse getBannerById(Long id) {
        requireAdmin();
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        return BannerResponse.fromEntity(banner);
    }

    public BannerResponse createBanner(BannerRequest request, MultipartFile file) {
        CurrentActor actor = requireAdmin();
        if (request == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        CloudinaryBannerMediaAdapter.requireUnchangedImage(request.imageUrl(), request.imagePublicId(), null, null);
        String title = validateTitle(request.title());
        String linkUrl = validateLinkUrl(request.linkUrl());
        String position = normalizePosition(request.position(), true);
        int displayOrder = validateDisplayOrder(request.displayOrder());
        validateSchedule(request.startAt(), request.endAt());
        boolean active = request.isActive() == null || request.isActive();

        mediaAdapter.validateImageFile(file);
        BannerUploadResult uploaded = mediaAdapter.uploadBannerImage(file);

        try {
            return transaction.execute(status -> {
                Banner banner = new Banner();
                banner.setTitle(title);
                banner.setImageUrl(uploaded.secureUrl());
                banner.setImagePublicId(uploaded.publicId());
                banner.setLinkUrl(linkUrl);
                banner.setPosition(position);
                banner.setDisplayOrder(displayOrder);
                banner.setStartAt(request.startAt());
                banner.setEndAt(request.endAt());
                banner.setIsActive(active);

                Banner saved = bannerRepository.saveAndFlush(banner);
                audit.record(actor.userId(), actor.role().name(), null, "BANNER_CREATED", "BANNER",
                        saved.getId(), Map.of(), snapshot(saved));
                return BannerResponse.fromEntity(saved);
            });
        } catch (RuntimeException failure) {
            mediaAdapter.retireOrphan(uploaded.publicId());
            throw failure;
        }
    }

    @Transactional
    public BannerResponse updateBanner(Long id, BannerRequest request) {
        CurrentActor actor = requireAdmin();
        if (request == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        Long expectedVersion = request.resolvedVersion();
        if (expectedVersion == null || expectedVersion < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        Banner banner = bannerRepository.findByIdWithLock(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (banner.getVersion() != expectedVersion) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        CloudinaryBannerMediaAdapter.requireUnchangedImage(
                request.imageUrl(), request.imagePublicId(), banner.getImageUrl(), banner.getImagePublicId());

        String title = validateTitle(request.title());
        String linkUrl = validateLinkUrl(request.linkUrl());
        String position = normalizePosition(request.position(), true);
        int displayOrder = validateDisplayOrder(request.displayOrder());
        validateSchedule(request.startAt(), request.endAt());
        boolean active = request.isActive() != null ? request.isActive() : Boolean.TRUE.equals(banner.getIsActive());

        Map<String, Object> before = snapshot(banner);
        banner.setTitle(title);
        banner.setLinkUrl(linkUrl);
        banner.setPosition(position);
        banner.setDisplayOrder(displayOrder);
        banner.setStartAt(request.startAt());
        banner.setEndAt(request.endAt());
        banner.setIsActive(active);

        Banner saved = bannerRepository.saveAndFlush(banner);
        audit.record(actor.userId(), actor.role().name(), null, "BANNER_UPDATED", "BANNER",
                saved.getId(), before, snapshot(saved));
        return BannerResponse.fromEntity(saved);
    }

    public BannerResponse uploadBannerImage(Long id, MultipartFile file, Long expectedVersion) {
        CurrentActor actor = requireAdmin();
        if (expectedVersion == null || expectedVersion < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        mediaAdapter.validateImageFile(file);

        readTransaction.executeWithoutResult(status -> {
            Banner existing = bannerRepository.findById(id)
                    .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
            if (existing.getVersion() != expectedVersion) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
        });

        BannerUploadResult uploaded = mediaAdapter.uploadBannerImage(file);
        try {
            return transaction.execute(status -> {
                Banner locked = bannerRepository.findByIdWithLock(id)
                        .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
                if (locked.getVersion() != expectedVersion) {
                    throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
                }
                Map<String, Object> before = snapshot(locked);
                String oldPublicId = locked.getImagePublicId();

                locked.setImageUrl(uploaded.secureUrl());
                locked.setImagePublicId(uploaded.publicId());

                Banner saved = bannerRepository.saveAndFlush(locked);
                audit.record(actor.userId(), actor.role().name(), null, "BANNER_IMAGE_REPLACED", "BANNER",
                        saved.getId(), before, snapshot(saved));

                if (oldPublicId != null && !oldPublicId.isBlank() && !oldPublicId.equals(uploaded.publicId())) {
                    mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
                }
                return BannerResponse.fromEntity(saved);
            });
        } catch (RuntimeException failure) {
            mediaAdapter.retireOrphan(uploaded.publicId());
            throw failure;
        }
    }

    @Transactional
    public void deleteBanner(Long id, Long expectedVersion) {
        CurrentActor actor = requireAdmin();
        if (expectedVersion != null && expectedVersion < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        Banner banner = bannerRepository.findByIdWithLock(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (expectedVersion != null && banner.getVersion() != expectedVersion) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        Map<String, Object> before = snapshot(banner);
        String oldPublicId = banner.getImagePublicId();

        bannerRepository.delete(banner);
        bannerRepository.flush();
        audit.record(actor.userId(), actor.role().name(), null, "BANNER_DELETED", "BANNER", id, before, Map.of());

        if (oldPublicId != null && !oldPublicId.isBlank()) {
            mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
        }
    }

    private CurrentActor requireAdmin() {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        return actor;
    }

    public static String validateTitle(String rawTitle) {
        if (rawTitle == null || rawTitle.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        String trimmed = rawTitle.strip();
        if (trimmed.length() > 180 || trimmed.codePoints().anyMatch(Character::isISOControl)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        return trimmed;
    }

    public static String normalizePosition(String rawPosition, boolean defaultIfMissing) {
        if (rawPosition == null || rawPosition.isBlank()) {
            return defaultIfMissing ? "HERO_HOME" : null;
        }
        String normalized = rawPosition.strip().toUpperCase(Locale.ROOT);
        if (!ALLOWED_POSITIONS.contains(normalized)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        return normalized;
    }

    public static int validateDisplayOrder(Integer displayOrder) {
        if (displayOrder == null) {
            return 0;
        }
        if (displayOrder < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        return displayOrder;
    }

    public static void validateSchedule(Instant startAt, Instant endAt) {
        if (startAt != null && endAt != null && !endAt.isAfter(startAt)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    public static String validateLinkUrl(String rawLinkUrl) {
        if (rawLinkUrl == null || rawLinkUrl.isBlank()) {
            return null;
        }
        String link = rawLinkUrl.strip();
        if (link.length() > 1024 || link.codePoints().anyMatch(Character::isISOControl)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (link.startsWith("/")) {
            if (link.startsWith("//") || link.startsWith("/\\") || link.contains("\\")) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
            return link;
        }
        try {
            URI uri = URI.create(link);
            String scheme = uri.getScheme();
            if (scheme == null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
            String lowerScheme = scheme.toLowerCase(Locale.ROOT);
            if (!"http".equals(lowerScheme) && !"https".equals(lowerScheme)) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
            if (uri.getHost() == null || uri.getHost().isBlank() || uri.getRawUserInfo() != null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
            return link;
        } catch (IllegalArgumentException failure) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    private Map<String, Object> snapshot(Banner banner) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("title", banner.getTitle());
        values.put("imageUrl", banner.getImageUrl());
        values.put("imagePublicId", banner.getImagePublicId());
        values.put("linkUrl", banner.getLinkUrl());
        values.put("position", banner.getPosition());
        values.put("displayOrder", banner.getDisplayOrder());
        values.put("startAt", banner.getStartAt());
        values.put("endAt", banner.getEndAt());
        values.put("isActive", banner.getIsActive());
        values.put("version", banner.getVersion());
        return values;
    }
}

