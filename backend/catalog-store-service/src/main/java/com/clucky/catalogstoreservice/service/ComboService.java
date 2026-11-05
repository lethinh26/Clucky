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
import com.clucky.catalogstoreservice.repository.StoreInventoryRepository;
import com.clucky.catalogstoreservice.repository.StoreProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ComboService {

    private final ComboRepository comboRepository;
    private final ComboItemRepository comboItemRepository;
    private final ProductRepository productRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreInventoryRepository storeInventoryRepository;
    private final CloudinaryMediaAdapter mediaAdapter;
    private final CatalogCacheService cacheService;

    public ComboService(ComboRepository comboRepository,
                        ComboItemRepository comboItemRepository,
                        ProductRepository productRepository,
                        StoreProductRepository storeProductRepository,
                        StoreInventoryRepository storeInventoryRepository,
                        CloudinaryMediaAdapter mediaAdapter,
                        CatalogCacheService cacheService) {
        this.comboRepository = comboRepository;
        this.comboItemRepository = comboItemRepository;
        this.productRepository = productRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeInventoryRepository = storeInventoryRepository;
        this.mediaAdapter = mediaAdapter;
        this.cacheService = cacheService;
    }

    @Transactional(readOnly = true)
    public List<ComboDto.Response> getAllCombos(boolean activeOnly) {
        return getAllCombos(null, activeOnly);
    }

    @Transactional(readOnly = true)
    public List<ComboDto.Response> getAllCombos(Long storeId, boolean activeOnly) {
        List<Combo> combos = comboRepository.findAllWithItems();
        OffsetDateTime now = OffsetDateTime.now();
        if (activeOnly) {
            combos = combos.stream().filter(c ->
                Boolean.TRUE.equals(c.getIsActive())
                && (c.getStartAt() == null || !now.isBefore(c.getStartAt()))
                && (c.getEndAt() == null || !now.isAfter(c.getEndAt()))
            ).collect(Collectors.toList());
        }
        return combos.stream().map(c -> toResponse(c, storeId)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ComboDto.Response getComboById(Long id) {
        return getComboById(id, null);
    }

    @Transactional(readOnly = true)
    public ComboDto.Response getComboById(Long id, Long storeId) {
        Combo combo = comboRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));
        return toResponse(combo, storeId);
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

        if (request.getName() != null && !request.getName().isBlank()) combo.setName(request.getName());
        if (request.getDescription() != null) combo.setDescription(request.getDescription());
        if (request.getComboPrice() != null) combo.setComboPrice(request.getComboPrice());
        if (request.getImageUrl() != null) combo.setImageUrl(request.getImageUrl());
        if (request.getImagePublicId() != null) combo.setImagePublicId(request.getImagePublicId());
        if (request.getStartAt() != null) combo.setStartAt(request.getStartAt());
        if (request.getEndAt() != null) combo.setEndAt(request.getEndAt());
        if (request.getIsActive() != null) combo.setIsActive(request.getIsActive());

        if (request.getItems() != null) {
            applyItems(combo, request.getItems());
        }

        Combo saved = comboRepository.save(combo);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public ComboDto.Response updateComboStatus(Long id, boolean isActive) {
        Combo combo = comboRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));
        combo.setIsActive(isActive);
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
                Product product = productRepository.findById(it.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Không tìm thấy món ăn với mã: " + it.getProductId()));
                ComboItem item = new ComboItem(null, combo, product, it.getQuantity(), it.getOptionId());
                combo.getItems().add(item);
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

    private ComboDto.Response toResponse(Combo c, Long storeId) {
        ComboDto.Response r = toResponse(c);
        if (storeId != null) {
            boolean available = Boolean.TRUE.equals(c.getIsActive());
            OffsetDateTime now = OffsetDateTime.now();
            if (c.getStartAt() != null && now.isBefore(c.getStartAt())) available = false;
            if (c.getEndAt() != null && now.isAfter(c.getEndAt())) available = false;

            boolean soldOut = false;
            if (c.getItems() == null || c.getItems().isEmpty()) {
                available = false;
            } else {
                for (ComboItem item : c.getItems()) {
                    Product cp = item.getProduct();
                    if (cp == null || !Boolean.TRUE.equals(cp.getIsActive())) {
                        available = false;
                        break;
                    }
                    var spOpt = storeProductRepository.findByStoreIdAndProductId(storeId, cp.getId());
                    var siOpt = storeInventoryRepository.findByStoreIdAndProductId(storeId, cp.getId());
                    if (spOpt.isEmpty() || !Boolean.TRUE.equals(spOpt.get().getIsAvailable())) {
                        available = false;
                        break;
                    }
                    if (Boolean.TRUE.equals(spOpt.get().getIsSoldOut())) {
                        soldOut = true;
                        available = false;
                        break;
                    }
                    int required = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;
                    if (siOpt.isEmpty() || (siOpt.get().getQuantityAvailable() != null && siOpt.get().getQuantityAvailable() < required)) {
                        soldOut = true;
                        available = false;
                        break;
                    }
                }
            }
            r.setIsAvailable(available);
            r.setIsSoldOut(soldOut);
        }
        return r;
    }
}
