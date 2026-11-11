package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.dto.BannerRequest;
import com.clucky.promotionloyaltyservice.dto.BannerResponse;
import com.clucky.promotionloyaltyservice.service.BannerService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/promotions/banners")
public class BannerController {
    private final BannerService bannerService;

    public BannerController(BannerService bannerService) {
        this.bannerService = bannerService;
    }

    @GetMapping
    public ResponseEntity<List<BannerResponse>> getActiveBanners(
            @RequestParam(name = "position", required = false) String position) {
        return ResponseEntity.ok(bannerService.getActiveBanners(position));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BannerResponse>> getAdminBanners(
            @RequestParam(name = "position", required = false) String position,
            @RequestParam(name = "isActive", required = false) Boolean isActive,
            @RequestParam(name = "keyword", required = false) String keyword) {
        return ResponseEntity.ok(bannerService.getAdminBanners(position, isActive, keyword));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BannerResponse> getBannerById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(bannerService.getBannerById(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BannerResponse> createBanner(
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestPart(value = "data", required = false) BannerRequest data,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "linkUrl", required = false) String linkUrl,
            @RequestParam(value = "position", required = false) String position,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
            @RequestParam(value = "startAt", required = false) Instant startAt,
            @RequestParam(value = "endAt", required = false) Instant endAt,
            @RequestParam(value = "isActive", required = false) Boolean isActive,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "imagePublicId", required = false) String imagePublicId) {
        BannerRequest request = data != null
                ? data
                : new BannerRequest(
                        title,
                        linkUrl,
                        position,
                        displayOrder,
                        startAt,
                        endAt,
                        isActive,
                        null,
                        null,
                        imageUrl,
                        imagePublicId);
        return ResponseEntity.status(HttpStatus.CREATED).body(bannerService.createBanner(request, file));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BannerResponse> updateBanner(
            @PathVariable("id") Long id,
            @Valid @RequestBody BannerRequest request) {
        return ResponseEntity.ok(bannerService.updateBanner(id, request));
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BannerResponse> uploadBannerImage(
            @PathVariable("id") Long id,
            @RequestParam(value = "expectedVersion", required = false) Long expectedVersion,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.ok(bannerService.uploadBannerImage(id, file, expectedVersion));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBanner(
            @PathVariable("id") Long id,
            @RequestParam(value = "expectedVersion", required = false) Long expectedVersion) {
        bannerService.deleteBanner(id, expectedVersion);
        return ResponseEntity.noContent().build();
    }
}

