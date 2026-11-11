package com.clucky.catalogstoreservice.config;

import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.entity.Product;
import com.clucky.catalogstoreservice.entity.ProductOption;
import com.clucky.catalogstoreservice.entity.ProductTopping;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.clucky.catalogstoreservice.repository.ComboItemRepository;
import com.clucky.catalogstoreservice.repository.ProductOptionRepository;
import com.clucky.catalogstoreservice.repository.ProductRepository;
import com.clucky.catalogstoreservice.repository.ProductToppingRepository;
import com.clucky.catalogstoreservice.service.CatalogCacheService;
import com.clucky.catalogstoreservice.service.ProductService;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiFunction;

public final class CatalogSelfCheck {
    public static void main(String[] args) {
        checkTokens();
        checkProductUpdates();
        System.out.println("Catalog self-check passed");
    }

    private static void checkTokens() {
        String secret = UUID.randomUUID().toString();
        Map<String, String> revoked = new HashMap<>();
        StringRedisTemplate redis = new StringRedisTemplate() {
            @Override
            public Boolean hasKey(String key) { return revoked.containsKey(key); }

            @Override
            @SuppressWarnings("unchecked")
            public ValueOperations<String, String> opsForValue() {
                return stub(ValueOperations.class, (method, arguments) -> revoked.get(arguments[0]));
            }
        };
        JwtDecoder decoder = new SecurityConfig().jwtDecoder(new JwtSettings(secret, "clucky", "catalog"), redis);
        Instant expiry = Instant.now().plusSeconds(300);
        for (String role : List.of("INTERNAL_SERVICE", "ADMIN", "CUSTOMER")) {
            decoder.decode(token(secret, role, "1", "clucky", "catalog", expiry, null));
        }
        decoder.decode(token(secret, "STAFF", "1", "clucky", "catalog", expiry, 2L));
        rejected(() -> decoder.decode(token(secret, "STAFF", "1", "clucky", "catalog", expiry, null)));
        rejected(() -> decoder.decode(token(secret, "UNKNOWN", "1", "clucky", "catalog", expiry, null)));
        rejected(() -> decoder.decode(token(secret, "INTERNAL_SERVICE", "0", "clucky", "catalog", expiry, null)));
        rejected(() -> decoder.decode(token(secret, "INTERNAL_SERVICE", "1", "wrong", "catalog", expiry, null)));
        rejected(() -> decoder.decode(token(secret, "INTERNAL_SERVICE", "1", "clucky", "wrong", expiry, null)));
        rejected(() -> decoder.decode(token(secret, "INTERNAL_SERVICE", "1", "clucky", "catalog", Instant.now().minusSeconds(300), null)));
        rejected(() -> decoder.decode(token(UUID.randomUUID().toString(), "INTERNAL_SERVICE", "1", "clucky", "catalog", expiry, null)));
        String serviceToken = token(secret, "INTERNAL_SERVICE", "1", "clucky", "catalog", expiry, null);
        Jwt accepted = decoder.decode(serviceToken);
        AccessTokenValidator validator = new AccessTokenValidator("catalog", redis);
        for (String claim : List.of("sid", "iat")) {
            Jwt missingClaim = Jwt.withTokenValue("check").headers(headers -> headers.putAll(accepted.getHeaders()))
                    .claims(claims -> { claims.putAll(accepted.getClaims()); claims.remove(claim); }).build();
            require(validator.validate(missingClaim).hasErrors(), "Missing " + claim + " was accepted");
        }
        Jwt refresh = Jwt.withTokenValue("check").headers(headers -> headers.putAll(accepted.getHeaders()))
                .claims(claims -> { claims.putAll(accepted.getClaims()); claims.put("typ", "refresh"); }).build();
        require(validator.validate(refresh).hasErrors(), "Refresh token accepted as access token");
        revoked.put("auth:revoked:sid:self-check", "1");
        rejected(() -> decoder.decode(serviceToken));
        revoked.clear();
        revoked.put("auth:revoked:user:1", Long.toString(Instant.now().toEpochMilli()));
        rejected(() -> decoder.decode(serviceToken));
        revoked.clear();
        decoder.decode(serviceToken);
    }

    private static String token(String secret, String role, String subject, String issuer,
                                String audience, Instant expiry, Long storeId) {
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder().issuer(issuer).subject(subject)
                .audience(List.of(audience)).expiresAt(expiry).claim("role", role)
                .issuedAt(expiry.minusSeconds(600)).claim("sid", "self-check").claim("typ", "access");
        if (storeId != null) claims.claim("storeId", storeId);
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(secret.getBytes(StandardCharsets.UTF_8)));
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build()))
                .getTokenValue();
    }

    private static void checkProductUpdates() {
        Fixture fixture = new Fixture();
        ProductOption originalOption = fixture.product.getOptions().getFirst();
        ProductTopping originalTopping = fixture.product.getToppings().getFirst();
        ProductDto.Request request = request("opt-11", "top-21");
        request.setName("Renamed product");
        fixture.service.updateProduct(1L, request);
        require(fixture.product.getOptions().getFirst() == originalOption, "Option identity changed");
        require(fixture.product.getToppings().getFirst() == originalTopping, "Topping identity changed");
        require(originalOption.getId().equals(11L) && originalTopping.getId().equals(21L), "Stored IDs changed");
        require(originalOption.getName().equals("Large") && originalOption.getExtraPrice().equals(BigDecimal.TEN), "Option was not updated");
        require(originalTopping.getToppingName().equals("Cheese"), "Topping was not updated");

        fixture.service.updateProduct(1L, new ProductDto.Request());
        require(fixture.product.getOptions().getFirst() == originalOption, "Omitted options were deleted");
        require(fixture.product.getToppings().getFirst() == originalTopping, "Omitted toppings were deleted");

        ProductDto.Request additions = request("opt-11", "top-21");
        additions.getOptions().getFirst().setChoices(List.of(
                new ProductDto.OptionChoiceDto("opt-11", "Large", BigDecimal.TEN),
                new ProductDto.OptionChoiceDto("new-choice", "Small", BigDecimal.ZERO)));
        additions.setToppings(List.of(new ProductDto.ToppingDto("top-21", "Cheese", BigDecimal.ONE),
                new ProductDto.ToppingDto(null, "Sauce", BigDecimal.ZERO)));
        fixture.service.updateProduct(1L, additions);
        require(fixture.product.getOptions().size() == 2 && fixture.product.getToppings().size() == 2, "New items missing");
        require(fixture.product.getOptions().getFirst() == originalOption, "Adding an option replaced existing one");
        fixture.service.updateProduct(1L, request("opt-11", "top-21"));
        require(fixture.product.getOptions().size() == 1 && fixture.product.getToppings().size() == 1, "Removed items survived");

        for (String invalidId : List.of("opt-999", "opt-bad", "opt-0", "top-11")) {
            expectError(ErrorCode.VALIDATION_ERROR, () -> new Fixture().service.updateProduct(1L, request(invalidId, "top-21")));
        }
        expectError(ErrorCode.VALIDATION_ERROR, () -> new Fixture().service.updateProduct(1L, request("opt-11", "top-999")));
        ProductDto.Request duplicate = request("opt-11", "top-21");
        ProductDto.OptionChoiceDto choice = duplicate.getOptions().getFirst().getChoices().getFirst();
        duplicate.getOptions().getFirst().setChoices(List.of(choice, choice));
        expectError(ErrorCode.VALIDATION_ERROR, () -> new Fixture().service.updateProduct(1L, duplicate));
        ProductDto.Request duplicateToppings = request("opt-11", "top-21");
        ProductDto.ToppingDto topping = duplicateToppings.getToppings().getFirst();
        duplicateToppings.setToppings(List.of(topping, topping));
        expectError(ErrorCode.VALIDATION_ERROR, () -> new Fixture().service.updateProduct(1L, duplicateToppings));

        Fixture referenced = new Fixture();
        referenced.optionInCombo = true;
        referenced.service.updateProduct(1L, request("opt-11", "top-21"));
        ProductDto.Request removal = new ProductDto.Request();
        removal.setOptions(List.of());
        removal.setToppings(List.of());
        expectError(ErrorCode.RESOURCE_CONFLICT, () -> referenced.service.updateProduct(1L, removal));
        require(referenced.product.getOptions().getFirst().getId().equals(11L), "Referenced option deleted");
        referenced.optionInCombo = false;
        referenced.service.updateProduct(1L, removal);
        require(referenced.product.getOptions().isEmpty() && referenced.product.getToppings().isEmpty(), "Explicit deletion failed");
    }

    private static ProductDto.Request request(String optionId, String toppingId) {
        ProductDto.Request request = new ProductDto.Request();
        request.setOptions(List.of(new ProductDto.OptionGroupDto("group", "Size", true,
                List.of(new ProductDto.OptionChoiceDto(optionId, "Large", BigDecimal.TEN)))));
        request.setToppings(List.of(new ProductDto.ToppingDto(toppingId, "Cheese", BigDecimal.ONE)));
        return request;
    }

    private static final class Fixture {
        final Product product = new Product();
        final ProductService service;
        boolean optionInCombo;
        long nextId = 100;

        Fixture() {
            product.setId(1L);
            product.setName("Chicken");
            product.setBasePrice(BigDecimal.TEN);
            product.getOptions().add(new ProductOption(11L, product, "Size", "Medium", BigDecimal.ZERO));
            product.getToppings().add(new ProductTopping(21L, product, "Sauce", BigDecimal.ZERO));
            ProductRepository products = stub(ProductRepository.class, (method, arguments) -> switch (method) {
                case "findByIdWithCategory" -> Optional.of(product);
                case "saveAndFlush" -> {
                    product.getOptions().stream().filter(option -> option.getId() == null).forEach(option -> option.setId(nextId++));
                    product.getToppings().stream().filter(topping -> topping.getId() == null).forEach(topping -> topping.setId(nextId++));
                    yield product;
                }
                default -> throw new AssertionError(method);
            });
            ProductOptionRepository options = stub(ProductOptionRepository.class, (method, arguments) -> product.getOptions());
            ProductToppingRepository toppings = stub(ProductToppingRepository.class, (method, arguments) -> product.getToppings());
            ComboItemRepository combos = stub(ComboItemRepository.class,
                    (method, arguments) -> optionInCombo && ((List<?>) arguments[0]).contains(11L));
            service = new ProductService(products, null, options, toppings, combos, null, null, null,
                    null, new CatalogCacheService(null), new com.clucky.catalogstoreservice.service.CatalogEvents(null, null, null, null) {
                        @Override public void expect(String table, Long id, Long version) { }
                        @Override public void audit(String action, String target, Long id, Long storeId) { }
                    });
        }
    }

    private static <Type> Type stub(Class<Type> type, BiFunction<String, Object[], Object> handler) {
        return type.cast(Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type},
                (proxy, method, arguments) -> handler.apply(method.getName(), arguments)));
    }

    private static void expectError(ErrorCode code, Runnable action) {
        try { action.run(); }
        catch (ApiException failure) {
            require(failure.getCode() == code, "Wrong error code");
            return;
        }
        throw new AssertionError("Expected " + code);
    }

    private static void rejected(Runnable action) {
        try { action.run(); }
        catch (JwtException expected) { return; }
        throw new AssertionError("Invalid token accepted");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
