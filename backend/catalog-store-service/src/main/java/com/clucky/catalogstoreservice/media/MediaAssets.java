package com.clucky.catalogstoreservice.media;

import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.clucky.catalogstoreservice.service.CatalogEvents;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class MediaAssets {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate independent;
    private final TransactionTemplate transaction;
    private final CatalogEvents events;

    public MediaAssets(JdbcTemplate jdbc, PlatformTransactionManager manager, CatalogEvents events) {
        this.jdbc = jdbc;
        this.events = events;
        this.transaction = new TransactionTemplate(manager);
        this.independent = new TransactionTemplate(manager);
        independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void reserve(String publicId) {
        independent.executeWithoutResult(status -> jdbc.update("INSERT INTO catalog_service.media_assets(public_id) VALUES (?)", publicId));
    }

    public void uploaded(String publicId, String url) {
        independent.executeWithoutResult(status -> jdbc.update("UPDATE catalog_service.media_assets SET secure_url=? WHERE public_id=?", url, publicId));
    }

    public void retire(String publicId) {
        jdbc.update("UPDATE catalog_service.media_assets SET cleanup_after=now() WHERE public_id=?", publicId);
    }

    public void attach(String publicId) {
        var rows = jdbc.queryForList("SELECT delete_requested FROM catalog_service.media_assets WHERE public_id=? FOR UPDATE", publicId);
        if (rows.isEmpty() || Boolean.TRUE.equals(rows.getFirst().get("delete_requested"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
    }

    private boolean referenced(String publicId, Object url) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM catalog_service.products WHERE image_public_id=? OR image_url=? "
                + "UNION ALL SELECT 1 FROM catalog_service.combos WHERE image_public_id=? OR image_url=? "
                + "UNION ALL SELECT 1 FROM catalog_service.categories WHERE image_url=?)", Boolean.class, publicId, url, publicId, url, url));
    }

    public void delete(String publicId, CloudinaryMediaAdapter provider) {
        if (com.clucky.catalogstoreservice.config.CurrentActor.require().role() != com.clucky.catalogstoreservice.dto.Role.ADMIN)
            throw new ApiException(ErrorCode.FORBIDDEN);
        independent.executeWithoutResult(status -> {
            var rows = jdbc.queryForList("SELECT id,secure_url FROM catalog_service.media_assets WHERE public_id=? FOR UPDATE", publicId);
            if (rows.isEmpty() || referenced(publicId, rows.getFirst().get("secure_url"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            jdbc.update("UPDATE catalog_service.media_assets SET delete_requested=true,cleanup_after=now() WHERE public_id=?", publicId);
            events.audit("MEDIA_DELETION_REQUESTED", "MediaAsset", ((Number) rows.getFirst().get("id")).longValue(), null);
        });
        transaction.executeWithoutResult(status -> {
            var rows = jdbc.queryForList("SELECT id,secure_url FROM catalog_service.media_assets WHERE public_id=? FOR UPDATE", publicId);
            if (rows.isEmpty()) return;
            if (referenced(publicId, rows.getFirst().get("secure_url"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            provider.destroyOwned(publicId);
            events.audit("MEDIA_DELETED", "MediaAsset", ((Number) rows.getFirst().get("id")).longValue(), null);
            jdbc.update("DELETE FROM catalog_service.media_assets WHERE public_id=?", publicId);
        });
    }

    public void cleanPending(CloudinaryMediaAdapter provider) {
        transaction.executeWithoutResult(status -> {
            var rows = jdbc.queryForList("SELECT public_id,secure_url FROM catalog_service.media_assets WHERE cleanup_after<=now() "
                    + "ORDER BY cleanup_after LIMIT 10 FOR UPDATE SKIP LOCKED");
            for (var row : rows) {
                String publicId = row.get("public_id").toString();
                if (!referenced(publicId, row.get("secure_url"))) {
                    try {
                        provider.destroyOwned(publicId);
                        jdbc.update("DELETE FROM catalog_service.media_assets WHERE public_id=?", publicId);
                        continue;
                    } catch (ApiException failure) {
                        if (failure.getCode() != ErrorCode.UPSTREAM_ERROR && failure.getCode() != ErrorCode.DEPENDENCY_UNAVAILABLE) throw failure;
                    }
                }
                jdbc.update("UPDATE catalog_service.media_assets SET cleanup_after=now()+interval '1 hour' WHERE public_id=?", publicId);
            }
        });
    }
}
