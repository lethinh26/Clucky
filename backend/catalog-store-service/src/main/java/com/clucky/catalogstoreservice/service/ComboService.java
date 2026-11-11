package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.ComboDto;
import com.clucky.catalogstoreservice.dto.MediaDto;
import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.entity.Combo;
import com.clucky.catalogstoreservice.entity.ComboItem;
import com.clucky.catalogstoreservice.entity.Product;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
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
    private final CatalogEvents events;

    public ComboService(ComboRepository comboRepository,
                        ComboItemRepository comboItemRepository,
                        ProductRepository productRepository,
                        StoreProductRepository storeProductRepository,
                        StoreInventoryRepository storeInventoryRepository,
                        CloudinaryMediaAdapter mediaAdapter,
                        CatalogCacheService cacheService, CatalogEvents events) {
        this.comboRepository = comboRepository;
        this.comboItemRepository = comboItemRepository;
        this.productRepository = productRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeInventoryRepository = storeInventoryRepository;
        this.mediaAdapter = mediaAdapter;
        this.cacheService = cacheService;
        this.events = events;
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
        CloudinaryMediaAdapter.requireUnchangedImage(request.getImageUrl(), request.getImagePublicId(), null, null);
        if (request.getItems() == null || request.getItems().isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
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

        validateDates(combo);
        Combo saved = comboRepository.saveAndFlush(combo);
        events.audit("COMBO_CREATED", "Combo", saved.getId(), null);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public ComboDto.Response updateCombo(Long id, ComboDto.Request request) {
        events.expect("combos", id, request.getExpectedVersion());
        Combo combo = comboRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));
        CloudinaryMediaAdapter.requireUnchangedImage(request.getImageUrl(), request.getImagePublicId(), combo.getImageUrl(), combo.getImagePublicId());

        if (request.getName() != null && !request.getName().isBlank()) combo.setName(request.getName());
        if (request.getDescription() != null) combo.setDescription(request.getDescription());
        if (request.getComboPrice() != null) combo.setComboPrice(request.getComboPrice());
        if (request.getImageUrl() != null) combo.setImageUrl(request.getImageUrl());
        if (request.getImagePublicId() != null) combo.setImagePublicId(request.getImagePublicId());
        if (request.isStartAtSpecified()) combo.setStartAt(request.getStartAt());
        if (request.isEndAtSpecified()) combo.setEndAt(request.getEndAt());
        if (request.getIsActive() != null) combo.setIsActive(request.getIsActive());

        if (request.getItems() != null) {
            applyItems(combo, request.getItems());
        }

        validateDates(combo);
        Combo saved = comboRepository.saveAndFlush(combo);
        events.audit("COMBO_UPDATED", "Combo", id, null);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public ComboDto.Response updateComboStatus(Long id, boolean isActive, Long expectedVersion) {
        events.expect("combos", id, expectedVersion);
        Combo combo = comboRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));
        combo.setIsActive(isActive);
        Combo saved = comboRepository.saveAndFlush(combo);
        events.audit("COMBO_STATUS_CHANGED", "Combo", id, null);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public void deleteCombo(Long id, Long expectedVersion) {
        events.expect("combos", id, expectedVersion);
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));

        String oldPublicId = combo.getImagePublicId();
        comboRepository.delete(combo);
        comboRepository.flush();
        events.audit("COMBO_DELETED", "Combo", id, null);

        if (oldPublicId != null && !oldPublicId.isBlank()) {
            mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
        }
        cacheService.evictAllStoreMenuCaches();
    }

    public ComboDto.Response uploadComboImage(Long id, MultipartFile file, Long expectedVersion) {
        events.expect("combos", id, expectedVersion);
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy combo với mã: " + id));

        String oldPublicId = combo.getImagePublicId();
        MediaDto.UploadResponse uploadRes = mediaAdapter.uploadImage(file, "combos");

        combo.setImageUrl(uploadRes.getSecureUrl());
        combo.setImagePublicId(uploadRes.getPublicId());
        Combo saved = comboRepository.saveAndFlush(combo);
        events.audit("COMBO_IMAGE_REPLACED", "Combo", id, null);

        if (oldPublicId != null && !oldPublicId.isBlank() && !oldPublicId.equals(uploadRes.getPublicId())) {
            mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
        }

        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    private void applyItems(Combo combo, List<ComboDto.ItemDto> itemsDto) {
        if (itemsDto != null) {
            if (itemsDto.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            var remaining = combo.getItems().stream().collect(Collectors.toMap(ComboItem::getId, item -> item));
            List<ComboItem> retained = new ArrayList<>();
            for (ComboDto.ItemDto it : itemsDto) {
                if (it.getQuantity() == null || it.getQuantity() < 1) throw new ApiException(ErrorCode.VALIDATION_ERROR);
                Product product = productRepository.findById(it.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Không tìm thấy món ăn với mã: " + it.getProductId()));
                if (it.getOptionId() != null && product.getOptions().stream().noneMatch(option -> it.getOptionId().equals(option.getId())))
                    throw new ApiException(ErrorCode.VALIDATION_ERROR);
                ComboItem item = it.getId() == null ? new ComboItem(null, combo, product, it.getQuantity(), it.getOptionId()) : remaining.remove(it.getId());
                if (item == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
                item.setProduct(product);
                item.setQuantity(it.getQuantity());
                item.setOptionId(it.getOptionId());
                retained.add(item);
            }
            combo.getItems().removeIf(item -> !retained.contains(item));
            for (ComboItem item : retained) if (!combo.getItems().contains(item)) combo.getItems().add(item);
        }
    }

    private void validateDates(Combo combo) {
        if (combo.getStartAt() != null && combo.getEndAt() != null && !combo.getEndAt().isAfter(combo.getStartAt()))
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
    }

    private ComboDto.Response toResponse(Combo c) {
        ComboDto.Response r = new ComboDto.Response();
        r.setId(c.getId());
        r.setVersion(c.getVersion());
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
                var responseItem = new ComboDto.ItemDto(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity(),
                        item.getOptionId()
                );
                responseItem.setId(item.getId());
                items.add(responseItem);
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
                var requiredByProduct = c.getItems().stream().collect(Collectors.groupingBy(item -> item.getProduct().getId(),
                        Collectors.summingLong(item -> item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1)));
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
                    long required = requiredByProduct.get(cp.getId());
                    if (siOpt.isEmpty() || siOpt.get().getQuantityAvailable() == null || siOpt.get().getQuantityAvailable() < required) {
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
