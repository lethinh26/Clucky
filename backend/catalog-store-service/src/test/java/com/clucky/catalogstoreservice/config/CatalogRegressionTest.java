package com.clucky.catalogstoreservice.config;

import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.entity.Product;
import com.clucky.catalogstoreservice.entity.Store;
import com.clucky.catalogstoreservice.entity.StoreProduct;
import com.clucky.catalogstoreservice.repository.*;
import com.clucky.catalogstoreservice.service.CatalogCacheService;
import com.clucky.catalogstoreservice.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CatalogRegressionTest {
    @Test
    void storesWithoutCurrentReadyAccountsCannotAcceptOrders() {
        var service = new com.clucky.catalogstoreservice.service.StoreService(null, null, null, null, null, null);
        var store = new Store();
        store.setStatus(com.clucky.catalogstoreservice.entity.StoreStatus.OPEN);
        store.setOpenTime(null);
        store.setCloseTime(null);
        for (String readiness : List.of("UNPROVISIONED", "LEGACY", "PENDING", "PROVISIONED")) {
            store.setAccountReadiness(readiness);
            assertFalse(service.isStoreServingNow(store));
        }
        store.setAccountReadiness("READY");
        assertTrue(service.isStoreServingNow(store));
    }

    @Test
    void missingInventoryCannotBeOrderedFromTheMenu() {
        var products = mock(ProductRepository.class);
        var options = mock(ProductOptionRepository.class);
        var toppings = mock(ProductToppingRepository.class);
        var stores = mock(StoreRepository.class);
        var storeProducts = mock(StoreProductRepository.class);
        var inventory = mock(StoreInventoryRepository.class);
        var product = new Product();
        product.setId(1L);
        var store = new Store();
        store.setId(2L);
        when(products.findAllWithCategory()).thenReturn(List.of(product));
        when(stores.findById(2L)).thenReturn(Optional.of(store));
        when(storeProducts.findByStoreId(2L)).thenReturn(List.of(
                new StoreProduct(null, store, product, null, true, false)));
        var service = new ProductService(products, null, options, toppings, null,
                stores, storeProducts, inventory, null, new CatalogCacheService(null), mock(com.clucky.catalogstoreservice.service.CatalogEvents.class));
        var result = service.getProducts(2L, null, null, null, false).getFirst();
        assertFalse(result.getIsAvailable());
        assertTrue(result.getIsSoldOut());
    }

    @Test
    void cacheBeanCanStartWithoutRedis() {
        try (var context = new AnnotationConfigApplicationContext(CatalogCacheService.class)) {
            assertNull(context.getBean(CatalogCacheService.class).getCachedMenu(null));
        }
    }

    @Test
    void largePageDoesNotOverflow() {
        var cache = mock(CatalogCacheService.class);
        var products = mock(ProductRepository.class);
        when(products.findAllWithCategory()).thenReturn(List.of());
        var service = new ProductService(products, null, null, null, null, null, null, null, null, cache,
                mock(com.clucky.catalogstoreservice.service.CatalogEvents.class));
        var result = service.getProductsPaged(null, null, null, null, false,
                PageRequest.of(Integer.MAX_VALUE, 20));
        assertTrue(result.content().isEmpty());
    }
}
