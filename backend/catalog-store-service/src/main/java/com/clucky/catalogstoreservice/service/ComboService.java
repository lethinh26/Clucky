package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.ComboDto;
import com.clucky.catalogstoreservice.dto.MediaDto;
import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.entity.Combo;
import com.clucky.catalogstoreservice.entity.ComboItem;
import com.clucky.catalogstoreservice.entity.Product;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.media.CloudinaryMediaAdapter;
import com.clucky.catalogstoreservice.repository.ComboItemRepository;
import com.clucky.catalogstoreservice.repository.ComboRepository;
import com.clucky.catalogstoreservice.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ComboService {

    private final ComboRepository comboRepository;
    private final ComboItemRepository comboItemRepository;
    private final ProductRepository productRepository;
    private final CloudinaryMediaAdapter mediaAdapter;
    private final CatalogCacheService cacheService;

    public ComboService(ComboRepository comboRepository,
                        ComboItemRepository comboItemRepository,
                        ProductRepository productRepository,
                        CloudinaryMediaAdapter mediaAdapter,
                        CatalogCacheService cacheService) {
        this.comboRepository = comboRepository;
        this.comboItemRepository = comboItemRepository;
        this.productRepository = productRepository;
        this.mediaAdapter = mediaAdapter;
        this.cacheService = cacheService;
    }

    @Transactional(readOnly = true)
    public List<ComboDto.Response> getAllCombos(boolean activeOnly) {
        List<Combo> combos = activeOnly
                ? comboRepository.findAllActiveWithItems()
                : comboRepository.findAllWithItems();
        return combos.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ComboDto.Response getComboById(Long id) {
        Combo combo = comboRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));
        return toResponse(combo);
    }

    public ComboDto.Response createCombo(ComboDto.Request request) {
        Combo combo = new Combo();
        combo.setName(request.getName());
        combo.setDescription(request.getDescription());
        combo.setComboPrice(request.getComboPrice());
        combo.setImageUrl(request.getImageUrl());
        combo.setImagePublicId(request.getImagePublicId());
        combo.setStartAt(request.getStartAt());
        combo.setEndAt(request.getEndAt());
        combo.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        applyItems(combo, request.getItems());

        Combo saved = comboRepository.save(combo);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public ComboDto.Response updateCombo(Long id, ComboDto.Request request) {
        Combo combo = comboRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));

        combo.setName(request.getName());
        combo.setDescription(request.getDescription());
        combo.setComboPrice(request.getComboPrice());
        if (request.getImageUrl() != null) combo.setImageUrl(request.getImageUrl());
        if (request.getImagePublicId() != null) combo.setImagePublicId(request.getImagePublicId());
        if (request.getStartAt() != null) combo.setStartAt(request.getStartAt());
        if (request.getEndAt() != null) combo.setEndAt(request.getEndAt());
        if (request.getIsActive() != null) combo.setIsActive(request.getIsActive());

        applyItems(combo, request.getItems());

        Combo saved = comboRepository.save(combo);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public void deleteCombo(Long id) {
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));

        String oldPublicId = combo.getImagePublicId();
        comboRepository.delete(combo);

        if (oldPublicId != null && !oldPublicId.isBlank()) {
            mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
        }
        cacheService.evictAllStoreMenuCaches();
    }

    public ComboDto.Response uploadComboImage(Long id, MultipartFile file) {
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));

        String oldPublicId = combo.getImagePublicId();
        MediaDto.UploadResponse uploadRes = mediaAdapter.uploadImage(file, "combos");

        combo.setImageUrl(uploadRes.getSecureUrl());
        combo.setImagePublicId(uploadRes.getPublicId());
        Combo saved = comboRepository.save(combo);

        if (oldPublicId != null && !oldPublicId.isBlank() && !oldPublicId.equals(uploadRes.getPublicId())) {
            mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
        }

        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    private void applyItems(Combo combo, List<ComboDto.ItemDto> itemsDto) {
        if (itemsDto != null) {
            combo.getItems().clear();
            for (ComboDto.ItemDto it : itemsDto) {
                if (it.getProductId() != null) {
                    productRepository.findById(it.getProductId()).ifPresent(p -> {
                        ComboItem item = new ComboItem(null, combo, p, it.getQuantity(), it.getOptionId());
                        combo.getItems().add(item);
                    });
                }
            }
        }
    }

    private ComboDto.Response toResponse(Combo c) {
        ComboDto.Response r = new ComboDto.Response();
        r.setId(c.getId());
        r.setName(c.getName());
        r.setSlug(ProductDto.toSlug(c.getName()) + "-" + c.getId());
        r.setDescription(c.getDescription());
        r.setComboPrice(c.getComboPrice());
        r.setImageUrl(c.getImageUrl());
        r.setImagePublicId(c.getImagePublicId());
        r.setStartAt(c.getStartAt() != null ? c.getStartAt().toString() : null);
        r.setEndAt(c.getEndAt() != null ? c.getEndAt().toString() : null);
        r.setIsActive(c.getIsActive());

        List<ComboDto.ItemDto> items = new ArrayList<>();
        if (c.getItems() != null) {
            for (ComboItem item : c.getItems()) {
                items.add(new ComboDto.ItemDto(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity(),
                        item.getOptionId()
                ));
            }
        }
        r.setItems(items);
        return r;
    }
}
