package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.StoreDto;
import com.clucky.catalogstoreservice.entity.Product;
import com.clucky.catalogstoreservice.entity.Store;
import com.clucky.catalogstoreservice.entity.StoreInventory;
import com.clucky.catalogstoreservice.entity.StoreProduct;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.repository.ProductRepository;
import com.clucky.catalogstoreservice.repository.StoreInventoryRepository;
import com.clucky.catalogstoreservice.repository.StoreProductRepository;
import com.clucky.catalogstoreservice.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class StoreService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreInventoryRepository storeInventoryRepository;
    private final CatalogCacheService cacheService;

    public StoreService(StoreRepository storeRepository,
                        ProductRepository productRepository,
                        StoreProductRepository storeProductRepository,
                        StoreInventoryRepository storeInventoryRepository,
                        CatalogCacheService cacheService) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeInventoryRepository = storeInventoryRepository;
        this.cacheService = cacheService;
    }

    @Transactional(readOnly = true)
    public List<StoreDto.Response> getAllStores(boolean activeOnly) {
        List<Store> stores = activeOnly
                ? storeRepository.findByStatus("ACTIVE")
                : storeRepository.findAll();
        return stores.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StoreDto.Response getStoreById(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + id));
        return toResponse(store);
    }

    public StoreDto.Response createStore(StoreDto.Request request) {
        Store store = new Store();
        store.setName(request.getName());
        store.setAddress(request.getAddress());
        store.setPhone(request.getPhone());
        store.setOpenTime(parseTime(request.getOpenTime(), "09:00"));
        store.setCloseTime(parseTime(request.getCloseTime(), "22:00"));
        store.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        store.setDeliveryArea(request.getDeliveryArea());

        Store saved = storeRepository.save(store);

        // Auto initialize store_products and store_inventory for existing active products
        List<Product> products = productRepository.findAll();
        for (Product p : products) {
            StoreProduct sp = new StoreProduct(null, saved, p, p.getBasePrice(), true, false);
            storeProductRepository.save(sp);

            StoreInventory si = new StoreInventory(null, saved, p, 50, 10, 1L);
            storeInventoryRepository.save(si);
        }

        return toResponse(saved);
    }

    public StoreDto.Response updateStore(Long id, StoreDto.Request request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + id));

        store.setName(request.getName());
        store.setAddress(request.getAddress());
        store.setPhone(request.getPhone());
        if (request.getOpenTime() != null) store.setOpenTime(parseTime(request.getOpenTime(), "09:00"));
        if (request.getCloseTime() != null) store.setCloseTime(parseTime(request.getCloseTime(), "22:00"));
        if (request.getStatus() != null) store.setStatus(request.getStatus());
        if (request.getDeliveryArea() != null) store.setDeliveryArea(request.getDeliveryArea());

        Store saved = storeRepository.save(store);
        cacheService.evictStoreMenuCache(id);
        return toResponse(saved);
    }

    public StoreDto.Response updateOperation(Long id, StoreDto.OperationRequest request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + id));

        if (request.getOpenTime() != null) store.setOpenTime(parseTime(request.getOpenTime(), "09:00"));
        if (request.getCloseTime() != null) store.setCloseTime(parseTime(request.getCloseTime(), "22:00"));
        if (request.getStatus() != null) store.setStatus(request.getStatus());

        Store saved = storeRepository.save(store);
        cacheService.evictStoreMenuCache(id);
        return toResponse(saved);
    }

    public void deleteStore(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + id));
        storeInventoryRepository.deleteByStoreId(id);
        storeProductRepository.deleteByStoreId(id);
        storeRepository.delete(store);
        cacheService.evictStoreMenuCache(id);
    }

    public StoreDto.Response toResponse(Store store) {
        return new StoreDto.Response(
                store.getId(),
                store.getName(),
                store.getAddress(),
                store.getPhone(),
                store.getOpenTime(),
                store.getCloseTime(),
                store.getStatus(),
                store.getDeliveryArea()
        );
    }

    private LocalTime parseTime(String timeStr, String fallback) {
        try {
            if (timeStr == null || timeStr.isBlank()) {
                return LocalTime.parse(fallback, TIME_FORMAT);
            }
            return LocalTime.parse(timeStr.trim(), TIME_FORMAT);
        } catch (Exception ex) {
            return LocalTime.parse(fallback, TIME_FORMAT);
        }
    }
}
