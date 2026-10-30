package com.clucky.catalogstoreservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class CatalogCacheService {

    private static final Logger log = LoggerFactory.getLogger(CatalogCacheService.class);
    private final StringRedisTemplate redisTemplate;

    public CatalogCacheService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        if (redisTemplate != null) {
            log.info("CatalogCacheService initialized with Redis support.");
        } else {
            log.info("CatalogCacheService running without Redis (caching disabled).");
        }
    }

    public void evictStoreMenuCache(Long storeId) {
        if (redisTemplate == null) return;
        try {
            if (storeId != null) {
                String key = "menu:store:" + storeId;
                redisTemplate.delete(key);
                log.info("Evicted Redis cache key: {}", key);
            } else {
                evictAllStoreMenuCaches();
            }
        } catch (Exception ex) {
            log.warn("Failed to evict Redis cache for store {}: {}", storeId, ex.getMessage());
        }
    }

    public void evictAllStoreMenuCaches() {
        if (redisTemplate == null) return;
        try {
            Set<String> keys = redisTemplate.keys("menu:store:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.info("Evicted all store menu caches: {} keys", keys.size());
            }
        } catch (Exception ex) {
            log.warn("Failed to evict all menu caches: {}", ex.getMessage());
        }
    }
}
