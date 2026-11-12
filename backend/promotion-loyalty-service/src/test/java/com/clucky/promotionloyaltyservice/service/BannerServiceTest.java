package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.BannerRequest;
import com.clucky.promotionloyaltyservice.dto.BannerUploadResult;
import com.clucky.promotionloyaltyservice.entity.Banner;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import com.clucky.promotionloyaltyservice.media.CloudinaryBannerMediaAdapter;
import com.clucky.promotionloyaltyservice.repository.BannerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BannerServiceTest {
    private BannerRepository bannerRepository;
    private CloudinaryBannerMediaAdapter mediaAdapter;
    private VoucherAuditOutbox audit;
    private BannerService bannerService;

    @BeforeEach
    void setup() {
        bannerRepository = mock(BannerRepository.class);
        mediaAdapter = mock(CloudinaryBannerMediaAdapter.class);
        audit = mock(VoucherAuditOutbox.class);
        PlatformTransactionManager txManager = new PlatformTransactionManager() {
            @Override
            public TransactionStatus getTransaction(TransactionDefinition definition) {
                return new SimpleTransactionStatus();
            }

            @Override
            public void commit(TransactionStatus status) {}

            @Override
            public void rollback(TransactionStatus status) {}
        };
        bannerService = new BannerService(bannerRepository, mediaAdapter, audit, txManager);
        setActor(1L, "ADMIN");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setActor(Long userId, String role) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject(String.valueOf(userId))
                .claim("role", role)
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    @Test
    void rejectsDangerousLinkSchemesInvalidSchedulesAndForgedImageFields() {
        MockMultipartFile file = new MockMultipartFile("file", "banner.png", "image/png", new byte[]{1, 2, 3});
        for (String badLink : new String[]{
                "javascript:alert(1)",
                "DATA:text/html,<script>alert(1)</script>",
                "vbscript:msgbox",
                "file:///etc/passwd",
                "//evil.example/redirect",
                "/\\evil.example",
                "relative-without-slash"
        }) {
            BannerRequest req = new BannerRequest("Promo", badLink, "HERO_HOME", 0, null, null, true, null, null, null, null);
            ApiException ex = assertThrows(ApiException.class, () -> bannerService.createBanner(req, file));
            assertEquals(ErrorCode.VALIDATION_ERROR, ex.getCode(), "Expected validation error for link: " + badLink);
        }

        Instant now = Instant.now();
        BannerRequest badSchedule = new BannerRequest("Promo", "/menu", "HERO_HOME", 0, now, now.minus(1, ChronoUnit.HOURS), true, null, null, null, null);
        assertEquals(ErrorCode.VALIDATION_ERROR,
                assertThrows(ApiException.class, () -> bannerService.createBanner(badSchedule, file)).getCode());

        BannerRequest forgedUrl = new BannerRequest("Promo", "/menu", "HERO_HOME", 0, null, null, true, null, null, "https://evil.test/x.png", null);
        assertEquals(ErrorCode.VALIDATION_ERROR,
                assertThrows(ApiException.class, () -> bannerService.createBanner(forgedUrl, file)).getCode());

        verifyNoInteractions(mediaAdapter, bannerRepository);
    }

    @Test
    void blocksNonAdminOnAdminOperations() {
        setActor(2L, "CUSTOMER");
        BannerRequest req = new BannerRequest("Promo", "/menu", "HERO_HOME", 0, null, null, true, 0L, null, null, null);
        MockMultipartFile file = new MockMultipartFile("file", "banner.png", "image/png", new byte[]{1});

        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> bannerService.getAdminBanners(null, null, null)).getCode());
        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> bannerService.createBanner(req, file)).getCode());
        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> bannerService.updateBanner(1L, req)).getCode());
        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> bannerService.uploadBannerImage(1L, file, 0L)).getCode());
        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> bannerService.deleteBanner(1L, 0L)).getCode());
    }

    @Test
    void createBannerRetiresOrphanWhenDbSaveFails() {
        MockMultipartFile file = new MockMultipartFile("file", "banner.png", "image/png", new byte[]{1, 2, 3});
        BannerUploadResult uploaded = new BannerUploadResult(
                "https://res.cloudinary.com/demo/image/upload/clucky/banners/new-1.png",
                "clucky/banners/new-1", "png", 100L, 1200, 480);
        when(mediaAdapter.uploadBannerImage(file)).thenReturn(uploaded);
        when(bannerRepository.saveAndFlush(any(Banner.class))).thenThrow(new IllegalStateException("DB down"));

        BannerRequest req = new BannerRequest("New Banner", "/menu", "HERO_HOME", 1, null, null, true, null, null, null, null);
        assertThrows(IllegalStateException.class, () -> bannerService.createBanner(req, file));
        var order = inOrder(mediaAdapter, bannerRepository);
        order.verify(mediaAdapter).attach(uploaded.publicId());
        order.verify(bannerRepository).saveAndFlush(any(Banner.class));
        verify(mediaAdapter).retireOrphan("clucky/banners/new-1");
    }

    @Test
    void replaceImageKeepsOldOnUploadFailureAndRetiresOldOnSuccess() {
        Banner existing = new Banner();
        existing.setId(10L);
        existing.setTitle("Hero");
        existing.setImageUrl("https://res.cloudinary.com/demo/image/upload/clucky/banners/old.png");
        existing.setImagePublicId("clucky/banners/old");
        existing.setPosition("HERO_HOME");
        existing.setDisplayOrder(0);
        existing.setIsActive(true);
        existing.setVersion(2L);

        when(bannerRepository.findById(10L)).thenReturn(Optional.of(existing));
        MockMultipartFile file = new MockMultipartFile("file", "new.png", "image/png", new byte[]{1, 2, 3});

        // 1. Provider fails -> old image untouched, deleteOldAssetAfterCommit never called
        when(mediaAdapter.uploadBannerImage(file)).thenThrow(new ApiException(ErrorCode.UPSTREAM_ERROR));
        assertEquals(ErrorCode.UPSTREAM_ERROR,
                assertThrows(ApiException.class, () -> bannerService.uploadBannerImage(10L, file, 2L)).getCode());
        verify(bannerRepository, never()).saveAndFlush(any());
        verify(mediaAdapter, never()).deleteOldAssetAfterCommit(anyString());

        // 2. Concurrent conflict after upload -> new image marked orphan, old image untouched
        BannerUploadResult newUpload = new BannerUploadResult(
                "https://res.cloudinary.com/demo/image/upload/clucky/banners/new.png",
                "clucky/banners/new", "png", 200L, 1200, 480);
        reset(mediaAdapter);
        when(mediaAdapter.uploadBannerImage(file)).thenReturn(newUpload);
        Banner newer = new Banner();
        newer.setId(10L);
        newer.setVersion(3L);
        when(bannerRepository.findByIdWithLock(10L)).thenReturn(Optional.of(newer));

        assertEquals(ErrorCode.RESOURCE_CONFLICT,
                assertThrows(ApiException.class, () -> bannerService.uploadBannerImage(10L, file, 2L)).getCode());
        verify(mediaAdapter).retireOrphan("clucky/banners/new");
        verify(mediaAdapter, never()).deleteOldAssetAfterCommit(anyString());

        // 3. Normal replace succeeds -> old image retired after commit
        reset(mediaAdapter);
        when(mediaAdapter.uploadBannerImage(file)).thenReturn(newUpload);
        when(bannerRepository.findByIdWithLock(10L)).thenReturn(Optional.of(existing));
        when(bannerRepository.saveAndFlush(any(Banner.class))).thenAnswer(inv -> inv.getArgument(0));

        var updated = bannerService.uploadBannerImage(10L, file, 2L);
        assertEquals("https://res.cloudinary.com/demo/image/upload/clucky/banners/new.png", updated.imageUrl());
        assertEquals("clucky/banners/new", updated.imagePublicId());
        verify(mediaAdapter).deleteOldAssetAfterCommit("clucky/banners/old");
    }

    @Test
    void deleteBannerSchedulesCleanupForOwnedPublicId() {
        Banner existing = new Banner();
        existing.setId(15L);
        existing.setTitle("Delete Me");
        existing.setImageUrl("https://res.cloudinary.com/demo/image/upload/clucky/banners/old.png");
        existing.setImagePublicId("clucky/banners/old");
        existing.setVersion(1L);
        when(bannerRepository.findByIdWithLock(15L)).thenReturn(Optional.of(existing));

        bannerService.deleteBanner(15L, 1L);
        verify(bannerRepository).delete(existing);
        verify(bannerRepository).flush();
        verify(mediaAdapter).deleteOldAssetAfterCommit("clucky/banners/old");
    }
}

