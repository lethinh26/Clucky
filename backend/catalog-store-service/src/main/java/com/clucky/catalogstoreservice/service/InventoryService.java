package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.InventoryDto;
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

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final StoreInventoryRepository storeInventoryRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final CatalogCacheService cacheService;

    public InventoryService(StoreInventoryRepository storeInventoryRepository,
                            StoreProductRepository storeProductRepository,
                            StoreRepository storeRepository,
                            ProductRepository productRepository,
                            CatalogCacheService cacheService) {
        this.storeInventoryRepository = storeInventoryRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.cacheService = cacheService;
    }

    @Transactional(readOnly = true)
    public List<InventoryDto.InventoryResponse> getStoreInventory(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + storeId));

        List<StoreInventory> inventoryList = storeInventoryRepository.findByStoreIdWithProductAndCategory(storeId);
        List<Product> allProducts = productRepository.findAll();

        // Check if all active products have an inventory record
        if (inventoryList.size() < allProducts.size()) {
            for (Product p : allProducts) {
                boolean exists = inventoryList.stream().anyMatch(i -> i.getProduct().getId().equals(p.getId()));
                if (!exists) {
                    StoreInventory newInv = new StoreInventory(null, store, p, 50, 10, 1L);
                    storeInventoryRepository.save(newInv);
                }
            }
            inventoryList = storeInventoryRepository.findByStoreIdWithProductAndCategory(storeId);
        }

        return inventoryList.stream().map(inv -> toResponse(inv, storeId)).collect(Collectors.toList());
    }

    public InventoryDto.InventoryResponse updateInventory(Long storeId, Long productId,
                                                         InventoryDto.InventoryUpdateRequest request,
                                                         Long updatedBy, String actorName) {
        StoreInventory inv = storeInventoryRepository.findByStoreIdAndProductId(storeId, productId)
                .orElseGet(() -> {
                    Store s = storeRepository.findById(storeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh: " + storeId));
                    Product p = productRepository.findById(productId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn: " + productId));
                    return new StoreInventory(null, s, p, 0, 10, updatedBy);
                });

        if (request.getQuantityAvailable() != null) {
            inv.setQuantityAvailable(request.getQuantityAvailable());
        }
        if (request.getLowStockThreshold() != null) {
            inv.setLowStockThreshold(request.getLowStockThreshold());
        }
        inv.setUpdatedBy(updatedBy != null ? updatedBy : 1L);
        inv.setUpdatedAt(OffsetDateTime.now());

        StoreInventory saved = storeInventoryRepository.save(inv);

        // Sync with store_products is_sold_out
        storeProductRepository.findByStoreIdAndProductId(storeId, productId).ifPresent(sp -> {
            boolean isSoldOut = Boolean.TRUE.equals(request.getIsSoldOut()) || saved.getQuantityAvailable() <= 0;
            sp.setIsSoldOut(isSoldOut);
            storeProductRepository.save(sp);
        });

        cacheService.evictStoreMenuCache(storeId);
        return toResponse(saved, storeId);
    }

    public void updateProductAvailability(Long storeId, Long productId,
                                          InventoryDto.AvailabilityUpdateRequest request) {
        StoreProduct sp = storeProductRepository.findByStoreIdAndProductId(storeId, productId)
                .orElseGet(() -> {
                    Store s = storeRepository.findById(storeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh: " + storeId));
                    Product p = productRepository.findById(productId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn: " + productId));
                    return new StoreProduct(null, s, p, p.getBasePrice(), true, false);
                });

        if (request.getIsAvailable() != null) {
            sp.setIsAvailable(request.getIsAvailable());
        }
        if (request.getIsSoldOut() != null) {
            sp.setIsSoldOut(request.getIsSoldOut());
        }
        if (request.getStorePrice() != null) {
            sp.setStorePrice(request.getStorePrice());
        }
        storeProductRepository.save(sp);

        // If marked as sold out, reflect on inventory
        if (Boolean.TRUE.equals(request.getIsSoldOut())) {
            storeInventoryRepository.findByStoreIdAndProductId(storeId, productId).ifPresent(inv -> {
                inv.setUpdatedAt(OffsetDateTime.now());
                storeInventoryRepository.save(inv);
            });
        }

        cacheService.evictStoreMenuCache(storeId);
    }

    private InventoryDto.InventoryResponse toResponse(StoreInventory inv, Long storeId) {
        Product p = inv.getProduct();
        boolean isSoldOut = storeProductRepository.findByStoreIdAndProductId(storeId, p.getId())
                .map(StoreProduct::getIsSoldOut)
                .orElse(inv.getQuantityAvailable() <= 0);

        String updatedByName = inv.getUpdatedBy() != null
                ? (inv.getUpdatedBy() == 1L ? "Quản trị viên (Admin)" : "Nhân viên ca trực #" + inv.getUpdatedBy())
                : "Hệ thống";

        return new InventoryDto.InventoryResponse(
                storeId,
                p.getId(),
                p.getName(),
                p.getCategory() != null ? p.getCategory().getName() : "Khác",
                p.getImageUrl(),
                inv.getQuantityAvailable(),
                inv.getLowStockThreshold(),
                isSoldOut,
                inv.getUpdatedAt() != null ? inv.getUpdatedAt().format(DATE_FORMAT) : "",
                updatedByName
        );
    }
}
