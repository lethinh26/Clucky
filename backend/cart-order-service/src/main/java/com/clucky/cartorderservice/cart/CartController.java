package com.clucky.cartorderservice.cart;

import com.clucky.cartorderservice.config.RedisConfig;
import com.clucky.cartorderservice.dto.Role;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    private record CartContext(String cartKey, Duration ttl, boolean isCustomer, Long userId, String guestSessionId) {}

    private CartContext resolveContext(HttpServletRequest request, HttpServletResponse response) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtToken && jwtToken.isAuthenticated()) {
            Jwt jwt = jwtToken.getToken();
            String role = jwt.getClaimAsString("role");
            if (role == null || !Role.CUSTOMER.name().equalsIgnoreCase(role)) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
            String sub = jwt.getSubject();
            if (sub == null || sub.isBlank()) {
                throw new ApiException(ErrorCode.UNAUTHENTICATED);
            }
            try {
                Long userId = Long.valueOf(sub);
                String cartKey = RedisConfig.key("cart", userId.toString());
                return new CartContext(cartKey, CartService.CUSTOMER_CART_TTL, true, userId, null);
            } catch (NumberFormatException e) {
                throw new ApiException(ErrorCode.UNAUTHENTICATED);
            }
        }

        // Guest session resolution
        String sessionId = request.getHeader("X-Guest-Session-Id");
        if (sessionId == null || sessionId.isBlank()) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie c : cookies) {
                    if ("clucky_guest_session".equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                        sessionId = c.getValue();
                        break;
                    }
                }
            }
        }
        if (sessionId == null || sessionId.isBlank()) {
            var httpSession = request.getSession(false);
            if (httpSession != null) {
                sessionId = httpSession.getId();
            }
        }
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        if (sessionId.length() > 255 || sessionId.chars().anyMatch(Character::isISOControl)) {
            sessionId = UUID.randomUUID().toString();
        }

        if (response != null) {
            response.setHeader("X-Guest-Session-Id", sessionId);
        }
        String cartKey = RedisConfig.key("cart:guest", sessionId);
        return new CartContext(cartKey, CartService.GUEST_CART_TTL, false, null, sessionId);
    }

    @GetMapping
    public ResponseEntity<CartDto> getCart(HttpServletRequest request, HttpServletResponse response) {
        CartContext ctx = resolveContext(request, response);
        CartDto cart = cartService.getCart(ctx.cartKey());
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/items")
    public ResponseEntity<CartDto> addItem(
            @Valid @RequestBody CartItemDto item,
            HttpServletRequest request,
            HttpServletResponse response) {
        CartContext ctx = resolveContext(request, response);
        CartDto cart = cartService.addItem(ctx.cartKey(), item, ctx.ttl());
        return ResponseEntity.ok(cart);
    }

    @PutMapping("/items/{itemKey}")
    public ResponseEntity<CartDto> updateItem(
            @PathVariable("itemKey") String itemKey,
            @RequestBody UpdateCartItemRequest updateRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        CartContext ctx = resolveContext(request, response);
        CartDto cart = cartService.updateItem(ctx.cartKey(), itemKey, updateRequest, ctx.ttl());
        return ResponseEntity.ok(cart);
    }

    @DeleteMapping("/items/{itemKey}")
    public ResponseEntity<CartDto> removeItem(
            @PathVariable("itemKey") String itemKey,
            HttpServletRequest request,
            HttpServletResponse response) {
        CartContext ctx = resolveContext(request, response);
        CartDto cart = cartService.removeItem(ctx.cartKey(), itemKey);
        return ResponseEntity.ok(cart);
    }

    @DeleteMapping
    public ResponseEntity<CartDto> clearCart(HttpServletRequest request, HttpServletResponse response) {
        CartContext ctx = resolveContext(request, response);
        CartDto cart = cartService.clearCart(ctx.cartKey());
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/merge")
    public ResponseEntity<CartDto> mergeCart(
            @RequestHeader(value = "X-Guest-Session-Id", required = false) String guestSessionHeader,
            @RequestBody(required = false) MergeCartRequest mergeRequest,
            HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtToken) || !jwtToken.isAuthenticated()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        Jwt jwt = jwtToken.getToken();
        String role = jwt.getClaimAsString("role");
        if (role == null || !Role.CUSTOMER.name().equalsIgnoreCase(role)) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        Long userId;
        try {
            userId = Long.valueOf(sub);
        } catch (NumberFormatException e) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }

        String guestSessionId = null;
        if (mergeRequest != null && mergeRequest.getSessionId() != null && !mergeRequest.getSessionId().isBlank()) {
            guestSessionId = mergeRequest.getSessionId().trim();
        } else if (guestSessionHeader != null && !guestSessionHeader.isBlank()) {
            guestSessionId = guestSessionHeader.trim();
        } else {
            var session = request.getSession(false);
            if (session != null) {
                guestSessionId = session.getId();
            }
        }

        CartDto cart = cartService.mergeCart(guestSessionId, userId);
        return ResponseEntity.ok(cart);
    }
}
