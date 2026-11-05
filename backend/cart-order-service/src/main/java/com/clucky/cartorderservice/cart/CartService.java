package com.clucky.cartorderservice.cart;

import com.clucky.cartorderservice.config.RedisConfig;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;

@Service
public class CartService {
    private static final Logger LOG = LoggerFactory.getLogger(CartService.class);

    public static final Duration GUEST_CART_TTL = Duration.ofHours(24);
    public static final Duration CUSTOMER_CART_TTL = Duration.ofDays(7);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public CartService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public CartDto getCart(String cartKey) {
        if (cartKey == null || cartKey.isBlank()) {
            return new CartDto(new ArrayList<>(), 0, BigDecimal.ZERO);
        }
        Map<Object, Object> rawEntries = redisTemplate.opsForHash().entries(cartKey);
        if (rawEntries == null || rawEntries.isEmpty()) {
            return new CartDto(new ArrayList<>(), 0, BigDecimal.ZERO);
        }
        List<CartItemDto> items = new ArrayList<>();
        for (Map.Entry<Object, Object> entry : rawEntries.entrySet()) {
            String itemJson = entry.getValue().toString();
            try {
                CartItemDto item = objectMapper.readValue(itemJson, CartItemDto.class);
                if (item.getItemKey() == null || item.getItemKey().isBlank()) {
                    item.setItemKey(entry.getKey().toString());
                }
                items.add(item);
            } catch (JsonProcessingException e) {
                LOG.warn("Failed to parse cart item JSON from key {}: {}", cartKey, itemJson, e);
            }
        }
        items.sort(Comparator.comparing(CartItemDto::getItemKey));
        return CartDto.of(items);
    }

    public CartDto addItem(String cartKey, CartItemDto item, Duration ttl) {
        if (item == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (!item.isValidItemType()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (item.getQuantity() == null || item.getQuantity() <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (item.getUnitPrice() == null) {
            item.setUnitPrice(BigDecimal.ZERO);
        }

        String itemKey = item.getItemKey();
        Object existingJsonObj = redisTemplate.opsForHash().get(cartKey, itemKey);
        try {
            if (existingJsonObj != null) {
                String existingJson = existingJsonObj.toString();
                CartItemDto existing = objectMapper.readValue(existingJson, CartItemDto.class);
                int newQty = (existing.getQuantity() != null ? existing.getQuantity() : 0) + item.getQuantity();
                existing.setQuantity(newQty);
                if (item.getNote() != null && !item.getNote().isBlank()) {
                    existing.setNote(item.getNote());
                }
                if (item.getUnitPrice() != null && item.getUnitPrice().compareTo(BigDecimal.ZERO) > 0) {
                    existing.setUnitPrice(item.getUnitPrice());
                }
                if (item.getItemName() != null && !item.getItemName().isBlank()) {
                    existing.setItemName(item.getItemName());
                }
                existing.setItemKey(itemKey);
                redisTemplate.opsForHash().put(cartKey, itemKey, objectMapper.writeValueAsString(existing));
            } else {
                item.setItemKey(itemKey);
                redisTemplate.opsForHash().put(cartKey, itemKey, objectMapper.writeValueAsString(item));
            }
            redisTemplate.expire(cartKey, ttl);
        } catch (JsonProcessingException e) {
            LOG.error("Failed to serialize cart item: {}", e.getMessage(), e);
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }

        return getCart(cartKey);
    }

    public CartDto updateItemQuantity(String cartKey, String itemKey, int quantity, Duration ttl) {
        if (itemKey == null || itemKey.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (quantity <= 0) {
            redisTemplate.opsForHash().delete(cartKey, itemKey);
            return getCart(cartKey);
        }
        Object existingJsonObj = redisTemplate.opsForHash().get(cartKey, itemKey);
        if (existingJsonObj == null) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        try {
            CartItemDto existing = objectMapper.readValue(existingJsonObj.toString(), CartItemDto.class);
            existing.setQuantity(quantity);
            existing.setItemKey(itemKey);
            redisTemplate.opsForHash().put(cartKey, itemKey, objectMapper.writeValueAsString(existing));
            redisTemplate.expire(cartKey, ttl);
        } catch (JsonProcessingException e) {
            LOG.error("Failed to serialize cart item: {}", e.getMessage(), e);
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
        return getCart(cartKey);
    }

    public CartDto updateItem(String cartKey, String itemKey, UpdateCartItemRequest request, Duration ttl) {
        if (request == null || request.getQuantity() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (request.getQuantity() <= 0) {
            return updateItemQuantity(cartKey, itemKey, 0, ttl);
        }
        if (itemKey == null || itemKey.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        Object existingJsonObj = redisTemplate.opsForHash().get(cartKey, itemKey);
        if (existingJsonObj == null) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        try {
            CartItemDto existing = objectMapper.readValue(existingJsonObj.toString(), CartItemDto.class);
            existing.setQuantity(request.getQuantity());
            if (request.getNote() != null) {
                existing.setNote(request.getNote());
            }
            if (request.getOptionIds() != null) {
                existing.setOptionIds(request.getOptionIds());
            }
            if (request.getToppingIds() != null) {
                existing.setToppingIds(request.getToppingIds());
            }
            existing.setItemKey(itemKey);
            redisTemplate.opsForHash().put(cartKey, itemKey, objectMapper.writeValueAsString(existing));
            redisTemplate.expire(cartKey, ttl);
        } catch (JsonProcessingException e) {
            LOG.error("Failed to update cart item: {}", e.getMessage(), e);
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
        return getCart(cartKey);
    }

    public CartDto removeItem(String cartKey, String itemKey) {
        if (itemKey != null && !itemKey.isBlank()) {
            redisTemplate.opsForHash().delete(cartKey, itemKey);
        }
        return getCart(cartKey);
    }

    public CartDto clearCart(String cartKey) {
        if (cartKey != null && !cartKey.isBlank()) {
            redisTemplate.delete(cartKey);
        }
        return new CartDto(new ArrayList<>(), 0, BigDecimal.ZERO);
    }

    public CartDto mergeCart(String guestSessionId, Long userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        String userKey = RedisConfig.key("cart", userId.toString());
        if (guestSessionId == null || guestSessionId.isBlank()) {
            return getCart(userKey);
        }
        String guestKey;
        try {
            guestKey = RedisConfig.key("cart:guest", guestSessionId);
        } catch (IllegalArgumentException e) {
            return getCart(userKey);
        }

        Map<Object, Object> guestEntries = redisTemplate.opsForHash().entries(guestKey);
        if (guestEntries != null && !guestEntries.isEmpty()) {
            Map<Object, Object> userEntries = redisTemplate.opsForHash().entries(userKey);
            Map<String, String> updates = new HashMap<>();

            for (Map.Entry<Object, Object> entry : guestEntries.entrySet()) {
                String itemKey = entry.getKey().toString();
                String guestJson = entry.getValue().toString();
                try {
                    CartItemDto guestItem = objectMapper.readValue(guestJson, CartItemDto.class);
                    if (userEntries != null && userEntries.containsKey(itemKey)) {
                        String userJson = userEntries.get(itemKey).toString();
                        CartItemDto userItem = objectMapper.readValue(userJson, CartItemDto.class);
                        int mergedQty = (userItem.getQuantity() != null ? userItem.getQuantity() : 0)
                                + (guestItem.getQuantity() != null ? guestItem.getQuantity() : 0);
                        userItem.setQuantity(mergedQty);
                        userItem.setItemKey(itemKey);
                        updates.put(itemKey, objectMapper.writeValueAsString(userItem));
                    } else {
                        guestItem.setItemKey(itemKey);
                        updates.put(itemKey, objectMapper.writeValueAsString(guestItem));
                    }
                } catch (JsonProcessingException e) {
                    LOG.warn("Failed to process item during merge: {}", e.getMessage());
                }
            }

            if (!updates.isEmpty()) {
                redisTemplate.opsForHash().putAll(userKey, updates);
            }
            redisTemplate.expire(userKey, CUSTOMER_CART_TTL);
            redisTemplate.delete(guestKey);
        }
        return getCart(userKey);
    }
}
