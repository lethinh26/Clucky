package com.clucky.promotionloyaltyservice.media;

import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class BannerMediaAssets {
    private static final Logger LOG = LoggerFactory.getLogger(BannerMediaAssets.class);

    private final JdbcTemplate jdbc;
    private final TransactionTemplate independent;
    private final TransactionTemplate transaction;

    public BannerMediaAssets(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.transaction = new TransactionTemplate(manager);
        this.independent = new TransactionTemplate(manager);
        this.independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void reserve(String publicId) {
        independent.executeWithoutResult(status -> jdbc.update(
                "INSERT INTO promotion_service.media_assets(public_id) VALUES (?)", publicId));
    }

    public void uploaded(String publicId, String url) {
        independent.executeWithoutResult(status -> jdbc.update(
                "UPDATE promotion_service.media_assets SET secure_url = ? WHERE public_id = ?", url, publicId));
    }

    public void attach(String publicId) {
        var rows = jdbc.queryForList(
                "SELECT delete_requested FROM promotion_service.media_assets WHERE public_id = ? FOR UPDATE",
                publicId);
        if (rows.isEmpty() || Boolean.TRUE.equals(rows.getFirst().get("delete_requested"))) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
    }

    public void retire(String publicId) {
        jdbc.update(
                "INSERT INTO promotion_service.media_assets(public_id, cleanup_after) VALUES (?, now()) "
                        + "ON CONFLICT (public_id) DO UPDATE SET cleanup_after = now()",
                publicId);
    }

    public void retireOrphan(String publicId) {
        independent.executeWithoutResult(status -> jdbc.update(
                "INSERT INTO promotion_service.media_assets(public_id, cleanup_after) VALUES (?, now()) "
                        + "ON CONFLICT (public_id) DO UPDATE SET cleanup_after = now()",
                publicId));
    }

    public boolean referenced(String publicId, Object url) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM promotion_service.banners WHERE image_public_id = ? OR image_url = ?)",
                Boolean.class, publicId, url));
    }

    public void cleanPending(CloudinaryBannerMediaAdapter provider) {
        transaction.executeWithoutResult(status -> {
            var rows = jdbc.queryForList(
                    "SELECT public_id, secure_url FROM promotion_service.media_assets "
                            + "WHERE cleanup_after <= now() ORDER BY cleanup_after LIMIT 10 FOR UPDATE SKIP LOCKED");
            for (var row : rows) {
                String publicId = row.get("public_id").toString();
                if (!referenced(publicId, row.get("secure_url"))) {
                    try {
                        provider.destroyOwned(publicId);
                        jdbc.update("DELETE FROM promotion_service.media_assets WHERE public_id = ?", publicId);
                        continue;
                    } catch (ApiException failure) {
                        if (failure.getCode() != ErrorCode.UPSTREAM_ERROR
                                && failure.getCode() != ErrorCode.DEPENDENCY_UNAVAILABLE) {
                            LOG.warn("event=banner_media_cleanup_rejected code={}", failure.getCode());
                        } else {
                            LOG.warn("event=banner_media_cleanup_deferred code={}", failure.getCode());
                        }
                    }
                }
                jdbc.update(
                        "UPDATE promotion_service.media_assets SET cleanup_after = now() + interval '5 minutes' "
                                + "WHERE public_id = ?",
                        publicId);
            }
        });
    }
}
