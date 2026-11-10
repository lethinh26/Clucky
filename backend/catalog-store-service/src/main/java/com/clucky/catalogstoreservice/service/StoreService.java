package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.StoreDto;
import com.clucky.catalogstoreservice.entity.Product;
import com.clucky.catalogstoreservice.entity.Store;
import com.clucky.catalogstoreservice.entity.StoreInventory;
import com.clucky.catalogstoreservice.entity.StoreProduct;
import com.clucky.catalogstoreservice.entity.StoreStatus;
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
    private static final java.time.ZoneId VIETNAM_ZONE = java.time.ZoneId.of("Asia/Ho_Chi_Minh");

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
                ? storeRepository.findByStatus(StoreStatus.OPEN)
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
        store.setLatitude(request.getLatitude());
        store.setLongitude(request.getLongitude());
        store.setDistrict(request.getDistrict());
        store.setCity(request.getCity());
        store.setPhone(request.getPhone());
        store.setOpenTime(parseTime(request.getOpenTime()));
        store.setCloseTime(parseTime(request.getCloseTime()));
        if (request.getStatus() != null) store.setStatus(StoreStatus.fromString(request.getStatus()));
        store.setDeliveryArea(request.getDeliveryArea());

        Store saved = storeRepository.save(store);

        // Auto initialize store_products and store_inventory for existing active products
        List<Product> products = productRepository.findAll();
        for (Product p : products) {
            StoreProduct sp = new StoreProduct(null, saved, p, null, true, false);
            storeProductRepository.save(sp);

            StoreInventory si = new StoreInventory(null, saved, p, 0, 10, null);
            storeInventoryRepository.save(si);
        }

        return toResponse(saved);
    }

    public StoreDto.Response updateStore(Long id, StoreDto.Request request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + id));

        ensureReady(store, request.getStatus());
        store.setName(request.getName());
        store.setAddress(request.getAddress());
        store.setLatitude(request.getLatitude());
        store.setLongitude(request.getLongitude());
        store.setDistrict(request.getDistrict());
        store.setCity(request.getCity());
        store.setPhone(request.getPhone());
        store.setOpenTime(parseTime(request.getOpenTime()));
        store.setCloseTime(parseTime(request.getCloseTime()));
        if (request.getStatus() != null) store.setStatus(StoreStatus.fromString(request.getStatus()));
        if (request.getDeliveryArea() != null) store.setDeliveryArea(request.getDeliveryArea());

        Store saved = storeRepository.save(store);
        cacheService.evictStoreMenuCache(id);
        return toResponse(saved);
    }

    public StoreDto.Response updateOperation(Long id, StoreDto.OperationRequest request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + id));

        ensureReady(store, request.getStatus());
        if (request.getOpenTime() != null) store.setOpenTime(parseTime(request.getOpenTime()));
        if (request.getCloseTime() != null) store.setCloseTime(parseTime(request.getCloseTime()));
        if (request.getStatus() != null) store.setStatus(StoreStatus.fromString(request.getStatus()));
        if (request.getPhone() != null && !request.getPhone().isBlank()) store.setPhone(request.getPhone().trim());
        if (request.getLatitude() != null) store.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) store.setLongitude(request.getLongitude());
        if (request.getDeliveryArea() != null) store.setDeliveryArea(request.getDeliveryArea());
        if (request.getLowStockThreshold() != null) {
            if (request.getLowStockThreshold() < 0) {
                throw new com.clucky.catalogstoreservice.exception.ApiException(com.clucky.catalogstoreservice.exception.ErrorCode.INVALID_THRESHOLD);
            }
            store.setLowStockThreshold(request.getLowStockThreshold());
        }

        Store saved = storeRepository.save(store);
        cacheService.evictStoreMenuCache(id);
        return toResponse(saved);
    }

    private void ensureReady(Store store, String status) {
        if (status != null && StoreStatus.fromString(status) == StoreStatus.OPEN
                && !List.of("READY", "LEGACY").contains(store.getAccountReadiness()))
            throw new com.clucky.catalogstoreservice.exception.ApiException(com.clucky.catalogstoreservice.exception.ErrorCode.RESOURCE_CONFLICT);
    }

    public void deleteStore(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + id));
        storeInventoryRepository.deleteByStoreId(id);
        storeProductRepository.deleteByStoreId(id);
        storeRepository.delete(store);
        cacheService.evictStoreMenuCache(id);
    }

    public boolean isStoreServingNow(Store store) {
        if (store == null || store.getStatus() != StoreStatus.OPEN) {
            return false;
        }
        LocalTime openTime = store.getOpenTime();
        LocalTime closeTime = store.getCloseTime();
        if (openTime == null || closeTime == null || openTime.equals(closeTime)) {
            return true;
        }
        LocalTime now = LocalTime.now(VIETNAM_ZONE);
        if (openTime.isBefore(closeTime)) {
            return !now.isBefore(openTime) && !now.isAfter(closeTime);
        } else {
            return !now.isBefore(openTime) || !now.isAfter(closeTime);
        }
    }

    public StoreDto.Response toResponse(Store store) {
        StoreDto.Response response = new StoreDto.Response(
                store.getId(),
                store.getName(),
                store.getAddress(),
                store.getDistrict(),
                store.getCity(),
                store.getPhone(),
                store.getOpenTime(),
                store.getCloseTime(),
                store.getStatus(),
                store.getDeliveryArea()
        );
        response.setAccountReadiness(store.getAccountReadiness());
        response.setIsOpenNow(isStoreServingNow(store));
        response.setLatitude(store.getLatitude());
        response.setLongitude(store.getLongitude());
        response.setLowStockThreshold(store.getLowStockThreshold());
        return response;
    }

    public StoreDto.Response updateLocation(Long id, StoreDto.LocationRequest request) {
        Store store = storeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Store not found"));
        store.setLatitude(request.latitude());
        store.setLongitude(request.longitude());
        return toResponse(storeRepository.save(store));
    }

    private LocalTime parseTime(String timeStr) {
        return LocalTime.parse(timeStr.trim(), TIME_FORMAT);
    }
}
