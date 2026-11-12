package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.InventoryDto;
import com.clucky.catalogstoreservice.entity.LowStockEpisode;
import com.clucky.catalogstoreservice.entity.Product;
import com.clucky.catalogstoreservice.entity.Store;
import com.clucky.catalogstoreservice.entity.StoreInventory;
import com.clucky.catalogstoreservice.entity.StoreProduct;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.repository.LowStockEpisodeRepository;
import com.clucky.catalogstoreservice.repository.ProductRepository;
import com.clucky.catalogstoreservice.repository.StoreInventoryRepository;
import com.clucky.catalogstoreservice.repository.StoreProductRepository;
import com.clucky.catalogstoreservice.repository.StoreRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {
    private static final Logger LOG = LoggerFactory.getLogger(InventoryService.class);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final StoreInventoryRepository storeInventoryRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final LowStockEpisodeRepository lowStockEpisodeRepository;
    private final LowStockAlertPublisher lowStockAlertPublisher;
    private final CatalogCacheService cacheService;
    private final CatalogEvents events;

    public InventoryService(
            StoreInventoryRepository storeInventoryRepository,
            StoreProductRepository storeProductRepository,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            LowStockEpisodeRepository lowStockEpisodeRepository,
            LowStockAlertPublisher lowStockAlertPublisher,
            CatalogCacheService cacheService, CatalogEvents events
    ) {
        this.storeInventoryRepository = storeInventoryRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.lowStockEpisodeRepository = lowStockEpisodeRepository;
        this.lowStockAlertPublisher = lowStockAlertPublisher;
        this.cacheService = cacheService;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<InventoryDto.InventoryResponse> getStoreInventory(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + storeId));

        List<StoreInventory> inventoryList = storeInventoryRepository.findByStoreIdWithProductAndCategory(storeId);
        int storeThreshold = store.getLowStockThreshold();

        return inventoryList.stream()
                .map(inv -> toResponse(inv, storeId, storeThreshold))
                .collect(Collectors.toList());
    }

    public InventoryDto.InventoryResponse updateInventory(
            Long storeId,
            Long productId,
            InventoryDto.InventoryUpdateRequest request,
            Long updatedBy
    ) {
        if (request.getQuantityAvailable() != null && request.getQuantityAvailable() < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh: " + storeId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn: " + productId));

        StoreInventory inv = storeInventoryRepository.lockByStoreAndProduct(storeId, productId)
                .orElseGet(() -> new StoreInventory(null, store, product, 0, store.getLowStockThreshold(), updatedBy));

        checkAdminVersion(inv.getVersion(), request.getExpectedVersion());

        int oldQuantity = inv.getQuantityAvailable() != null ? inv.getQuantityAvailable() : 0;
        int newQuantity = request.getQuantityAvailable() != null ? request.getQuantityAvailable() : oldQuantity;
        int storeThreshold = store.getLowStockThreshold();

        inv.setQuantityAvailable(newQuantity);
        inv.setLowStockThreshold(storeThreshold);
        inv.setUpdatedBy(updatedBy);
        inv.setUpdatedAt(OffsetDateTime.now());

        StoreInventory saved = storeInventoryRepository.saveAndFlush(inv);
        events.audit("INVENTORY_UPDATED", "Product", productId, storeId);

        // Sync availability: If quantity is 0 or less, must mark is_sold_out = true
        storeProductRepository.findByStoreIdAndProductId(storeId, productId).ifPresent(sp -> {
            if (newQuantity <= 0) {
                sp.setIsSoldOut(true);
            } else if (request.getIsSoldOut() != null) {
                sp.setIsSoldOut(request.getIsSoldOut());
            }
            storeProductRepository.saveAndFlush(sp);
        });

        // Episode evaluation
        evaluateStockEpisode(storeId, product, oldQuantity, newQuantity, storeThreshold);

        cacheService.evictStoreMenuCache(storeId);
        return toResponse(saved, storeId, storeThreshold);
    }

    public void changeForOrder(long storeId, long productId, int delta) {
        StoreInventory inventory = storeInventoryRepository.lockByStoreAndProduct(storeId, productId)
                .orElseThrow(() -> new ApiException(ErrorCode.INSUFFICIENT_INVENTORY));
        int previous = inventory.getQuantityAvailable();
        int quantity = Math.addExact(previous, delta);
        if (quantity < 0) throw new ApiException(ErrorCode.INSUFFICIENT_INVENTORY);
        inventory.setQuantityAvailable(quantity);
        inventory.setUpdatedBy(null);
        inventory.setUpdatedAt(OffsetDateTime.now());
        storeInventoryRepository.saveAndFlush(inventory);
        storeProductRepository.findByStoreIdAndProductId(storeId, productId).ifPresent(product -> {
            if (quantity == 0) product.setIsSoldOut(true);
            else if (previous == 0) product.setIsSoldOut(false);
            storeProductRepository.saveAndFlush(product);
        });
        evaluateStockEpisode(storeId, inventory.getProduct(), previous, quantity, inventory.getStore().getLowStockThreshold());
        cacheService.evictStoreMenuCache(storeId);
    }

    public long updateStoreThreshold(Long storeId, Integer newThreshold, Long expectedVersion) {
        if (newThreshold == null || newThreshold < 0) {
            throw new ApiException(ErrorCode.INVALID_THRESHOLD);
        }

        if (com.clucky.catalogstoreservice.config.CurrentActor.require().role() == com.clucky.catalogstoreservice.dto.Role.ADMIN || expectedVersion != null)
            events.expect("stores", storeId, expectedVersion);
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh: " + storeId));

        int oldThreshold = store.getLowStockThreshold();
        if (oldThreshold == newThreshold) {
            return store.getVersion();
        }

        store.setLowStockThreshold(newThreshold);
        storeRepository.saveAndFlush(store);
        events.audit("STORE_THRESHOLD_UPDATED", "Store", storeId, storeId);

        // Re-evaluate affected products in store inventory
        List<StoreInventory> inventories = storeInventoryRepository.findByStoreIdWithProductAndCategory(storeId);
        for (StoreInventory item : inventories) {
            Product p = item.getProduct();
            int qty = item.getQuantityAvailable() != null ? item.getQuantityAvailable() : 0;
            Optional<LowStockEpisode> openEpisode = lowStockEpisodeRepository
                    .findByStoreIdAndProductIdAndStatus(storeId, p.getId(), "OPEN");

            if (qty <= newThreshold) {
                if (openEpisode.isEmpty()) {
                    // Newly low stock under increased threshold -> open episode and alert
                    String episodeId = UUID.randomUUID().toString();
                    LowStockEpisode episode = new LowStockEpisode();
                    episode.setEpisodeId(episodeId);
                    episode.setStoreId(storeId);
                    episode.setProductId(p.getId());
                    episode.setStatus("OPEN");
                    episode.setTriggerQuantity(qty);
                    episode.setThreshold(newThreshold);
                    episode.setOpenedAt(Instant.now());
                    lowStockEpisodeRepository.save(episode);

                    lowStockAlertPublisher.publishLowStockAlert(storeId, p.getId(), p.getName(), qty, newThreshold, episodeId);
                }
            } else {
                if (openEpisode.isPresent()) {
                    // No longer low stock under reduced threshold -> close episode
                    LowStockEpisode episode = openEpisode.get();
                    episode.setStatus("CLOSED");
                    episode.setClosedAt(Instant.now());
                    episode.setClosedByQuantity(qty);
                    lowStockEpisodeRepository.save(episode);
                }
            }
        }

        cacheService.evictStoreMenuCache(storeId);
        return store.getVersion();
    }

    public void updateProductAvailability(
            Long storeId,
            Long productId,
            InventoryDto.AvailabilityUpdateRequest request
    ) {
        StoreProduct sp = storeProductRepository.findByStoreIdAndProductId(storeId, productId)
                .orElseGet(() -> {
                    Store s = storeRepository.findById(storeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh: " + storeId));
                    Product p = productRepository.findById(productId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn: " + productId));
                    return new StoreProduct(null, s, p, null, true, false);
                });

        checkAdminVersion(sp.getVersion(), request.getExpectedVersion());
        Optional<StoreInventory> invOpt = storeInventoryRepository.findByStoreIdAndProductId(storeId, productId);
        int currentQty = invOpt.map(StoreInventory::getQuantityAvailable).orElse(0);

        // Rule: Quantity <= 0 cannot be sold
        if (Boolean.FALSE.equals(request.getIsSoldOut()) && currentQty <= 0) {
            LOG.warn("event=availability_rejected reason=out_of_stock storeId={} productId={}", storeId, productId);
            throw new ApiException(ErrorCode.PRODUCT_OUT_OF_STOCK);
        }

        if (request.getIsAvailable() != null) {
            sp.setIsAvailable(request.getIsAvailable());
        }
        if (request.getIsSoldOut() != null) {
            // Cannot enable if quantity is 0
            if (!request.getIsSoldOut() && currentQty <= 0) {
                throw new ApiException(ErrorCode.PRODUCT_OUT_OF_STOCK);
            }
            sp.setIsSoldOut(request.getIsSoldOut());
        }
        if (Boolean.TRUE.equals(request.getClearStorePrice())) {
            sp.setStorePrice(null);
        } else if (request.getStorePrice() != null) {
            sp.setStorePrice(request.getStorePrice());
        }
        storeProductRepository.saveAndFlush(sp);
        events.audit("PRODUCT_AVAILABILITY_UPDATED", "Product", productId, storeId);

        if (Boolean.TRUE.equals(request.getIsSoldOut()) && invOpt.isPresent()) {
            StoreInventory inv = invOpt.get();
            inv.setUpdatedAt(OffsetDateTime.now());
            storeInventoryRepository.save(inv);
        }

        cacheService.evictStoreMenuCache(storeId);
    }

    private void evaluateStockEpisode(
            Long storeId,
            Product product,
            int oldQuantity,
            int newQuantity,
            int storeThreshold
    ) {
        Optional<LowStockEpisode> openEpisode = lowStockEpisodeRepository
                .findByStoreIdAndProductIdAndStatus(storeId, product.getId(), "OPEN");

        if (oldQuantity > storeThreshold && newQuantity <= storeThreshold) {
            // Transition from ABOVE threshold to AT OR BELOW -> Open episode and emit 1 alert
            if (openEpisode.isEmpty()) {
                String episodeId = UUID.randomUUID().toString();
                LowStockEpisode episode = new LowStockEpisode();
                episode.setEpisodeId(episodeId);
                episode.setStoreId(storeId);
                episode.setProductId(product.getId());
                episode.setStatus("OPEN");
                episode.setTriggerQuantity(newQuantity);
                episode.setThreshold(storeThreshold);
                episode.setOpenedAt(Instant.now());
                lowStockEpisodeRepository.save(episode);

                LOG.info("event=low_stock_episode_opened storeId={} productId={} qty={} threshold={} episodeId={}",
                        storeId, product.getId(), newQuantity, storeThreshold, episodeId);

                lowStockAlertPublisher.publishLowStockAlert(
                        storeId, product.getId(), product.getName(), newQuantity, storeThreshold, episodeId);
            }
        } else if (newQuantity <= storeThreshold && openEpisode.isPresent()) {
            // Further decrease or still low stock (e.g. 20 -> 19) -> DO NOT duplicate alert
            LOG.info("event=low_stock_episode_maintained storeId={} productId={} qty={}",
                    storeId, product.getId(), newQuantity);
        } else if (oldQuantity <= storeThreshold && newQuantity > storeThreshold) {
            // Replenished above threshold -> Close open episode
            if (openEpisode.isPresent()) {
                LowStockEpisode episode = openEpisode.get();
                episode.setStatus("CLOSED");
                episode.setClosedAt(Instant.now());
                episode.setClosedByQuantity(newQuantity);
                lowStockEpisodeRepository.save(episode);

                LOG.info("event=low_stock_episode_closed storeId={} productId={} qty={} episodeId={}",
                        storeId, product.getId(), newQuantity, episode.getEpisodeId());
            }
        }
    }

    private InventoryDto.InventoryResponse toResponse(StoreInventory inv, Long storeId, int storeThreshold) {
        Product p = inv.getProduct();
        Optional<StoreProduct> availability = storeProductRepository.findByStoreIdAndProductId(storeId, p.getId());
        boolean isSoldOut = (inv.getQuantityAvailable() != null && inv.getQuantityAvailable() <= 0)
                || availability
                        .map(StoreProduct::getIsSoldOut)
                        .orElse(false);

        String updatedByName = inv.getUpdatedBy() != null
                ? "Tài khoản #" + inv.getUpdatedBy()
                : "Hệ thống";

        var response = new InventoryDto.InventoryResponse(
                storeId,
                p.getId(),
                p.getName(),
                p.getCategory() != null ? p.getCategory().getName() : "Khác",
                p.getImageUrl(),
                inv.getQuantityAvailable(),
                storeThreshold,
                isSoldOut,
                inv.getUpdatedAt() != null ? inv.getUpdatedAt().format(DATE_FORMAT) : "",
                updatedByName
        );
        response.setVersion(inv.getVersion());
        response.setAvailabilityVersion(availability.map(StoreProduct::getVersion).orElse(0L));
        return response;
    }

    static void checkAdminVersion(Long version, Long expectedVersion) {
        if (com.clucky.catalogstoreservice.config.CurrentActor.require().role() != com.clucky.catalogstoreservice.dto.Role.ADMIN
                && expectedVersion == null) return;
        if (expectedVersion == null || expectedVersion < 0)
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (!expectedVersion.equals(version)) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
    }
}
