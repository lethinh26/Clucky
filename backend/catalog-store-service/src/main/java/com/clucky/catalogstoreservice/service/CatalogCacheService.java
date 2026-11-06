package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.ProductDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Set;

@Service
public class CatalogCacheService {

    private static final Logger log = LoggerFactory.getLogger(CatalogCacheService.class);
    private static final Duration MENU_CACHE_TTL = Duration.ofMinutes(5); // 300 seconds

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public CatalogCacheService(StringRedisTemplate redisTemplate) {
        this(redisTemplate, null);
    }

    @Autowired
    public CatalogCacheService(@Autowired(required = false) StringRedisTemplate redisTemplate,
                               @Autowired(required = false) ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper != null
                ? objectMapper.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                : new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        if (redisTemplate != null) {
            log.info("CatalogCacheService initialized with Redis support.");
        } else {
            log.info("CatalogCacheService running without Redis (caching disabled).");
        }
    }

    public List<ProductDto.Response> getCachedMenu(Long storeId) {
        if (redisTemplate == null) return null;
        try {
            String key = storeId != null ? "menu:store:" + storeId : "menu:store:all";
            String json = redisTemplate.opsForValue().get(key);
            if (json != null && !json.isBlank()) {
                List<ProductDto.Response> cached = objectMapper.readValue(json, new TypeReference<List<ProductDto.Response>>() {});
                log.debug("Redis cache HIT for key '{}', items count: {}", key, cached != null ? cached.size() : 0);
                return cached;
            }
        } catch (Exception ex) {
            log.warn("Failed to get Redis cache for store {}: {}", storeId, ex.getMessage());
        }
        return null;
    }

    public void setCachedMenu(Long storeId, List<ProductDto.Response> menu) {
        if (redisTemplate == null || menu == null) return;
        try {
            String key = storeId != null ? "menu:store:" + storeId : "menu:store:all";
            String json = objectMapper.writeValueAsString(menu);
            redisTemplate.opsForValue().set(key, json, MENU_CACHE_TTL);
            log.debug("Redis cache SAVED for key '{}', items count: {}, TTL: {}", key, menu.size(), MENU_CACHE_TTL);
        } catch (Exception ex) {
            log.warn("Failed to set Redis cache for store {}: {}", storeId, ex.getMessage());
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
