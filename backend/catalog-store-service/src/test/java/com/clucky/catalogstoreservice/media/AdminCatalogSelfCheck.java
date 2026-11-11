package com.clucky.catalogstoreservice.media;

import com.clucky.catalogstoreservice.config.CloudinaryProperties;
import com.clucky.catalogstoreservice.entity.Store;
import com.clucky.catalogstoreservice.entity.StoreStatus;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.clucky.catalogstoreservice.repository.StoreRepository;
import com.clucky.catalogstoreservice.service.CatalogCacheService;
import com.clucky.catalogstoreservice.service.CatalogEvents;
import com.clucky.catalogstoreservice.service.StoreService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class AdminCatalogSelfCheck {
    public static void main(String[] arguments) throws Exception {
        var token = Jwt.withTokenValue("self-check").header("alg", "HS256").subject("1").claim("role", "ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        try {
            var jdbc = new RecordingJdbc();
            var manager = new AbstractPlatformTransactionManager() {
                @Override protected Object doGetTransaction() { return new Object(); }
                @Override protected void doBegin(Object transaction, TransactionDefinition definition) { }
                @Override protected void doCommit(DefaultTransactionStatus status) { }
                @Override protected void doRollback(DefaultTransactionStatus status) { }
            };
            var mapper = new ObjectMapper().findAndRegisterModules();
            var events = new CatalogEvents(jdbc, mapper, null, manager);
            expect(ErrorCode.VALIDATION_ERROR, () -> events.expect("products", 1L, null));
            events.expect("products", 1L, 0L);
            expect(ErrorCode.RESOURCE_CONFLICT, () -> events.expect("products", 1L, 0L));

            var assets = new MediaAssets(jdbc, manager, events);
            var provider = new Provider(assets);
            expect(ErrorCode.UNSUPPORTED_MEDIA_TYPE, () -> provider.validateImageFile(new ImageBytes(new byte[]{1, 2, 3})));
            var png = new ByteArrayOutputStream();
            javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(1, 1, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", png);
            provider.validateImageFile(new ImageBytes(png.toByteArray()));
            expect(ErrorCode.VALIDATION_ERROR, () -> CloudinaryMediaAdapter.requireUnchangedImage("https://foreign.test/image.png", "foreign", null, null));

            jdbc.referenced = true;
            expect(ErrorCode.RESOURCE_CONFLICT, () -> assets.delete(jdbc.publicId, provider));
            require(provider.attempts == 0 && !jdbc.cleanupQueued, "Referenced image was scheduled for deletion");
            jdbc.referenced = false;
            expect(ErrorCode.UPSTREAM_ERROR, () -> assets.delete(jdbc.publicId, provider));
            require(jdbc.cleanupQueued && !jdbc.deleted, "Failed provider deletion lost its cleanup intent");
            expect(ErrorCode.RESOURCE_CONFLICT, () -> assets.attach(jdbc.publicId));
            var envelope = mapper.readTree(jdbc.envelope);
            require(envelope.path("payload").path("action").asText().equals("MEDIA_DELETION_REQUESTED"), "Deletion was falsely audited as completed");
            require(envelope.path("sourceService").asText().equals("catalog-store-service") && !envelope.path("eventId").asText().isBlank(), "Missing durable event identity");
            provider.fail = false;
            assets.cleanPending(provider);
            require(jdbc.deleted && provider.attempts == 2, "Cleanup did not retry the failed deletion");

            var store = new Store();
            store.setId(9L);
            StoreRepository repository = (StoreRepository) Proxy.newProxyInstance(StoreRepository.class.getClassLoader(), new Class<?>[]{StoreRepository.class},
                    (proxy, method, values) -> switch (method.getName()) {
                        case "findById" -> Optional.of(store);
                        case "saveAndFlush" -> store;
                        default -> throw new AssertionError("Unexpected store operation: " + method.getName());
                    });
            var stores = new StoreService(repository, null, null, null, new CatalogCacheService(null), events);
            var deactivated = stores.deleteStore(9L, jdbc.version);
            require(deactivated.getId() == 9L && store.getStatus() == StoreStatus.INACTIVE, "Store history ID was not preserved");
            require(!stores.isStoreServingNow(store), "Inactive store still accepts orders");
            var branches = new com.clucky.catalogstoreservice.service.BranchProvisioning(null, null, null, null, mapper, null, null, events) {
                @Override public Long managerUserId(long storeId) { return 21L; }
            };
            new com.clucky.catalogstoreservice.service.LowStockAlertPublisher(events, mapper, branches)
                    .publishLowStockAlert(9L, 1L, "Chicken", 2, 5, "episode-1");
            var lowStock = mapper.readTree(jdbc.envelope);
            require(lowStock.path("eventType").asText().equals("inventory.low-stock")
                    && lowStock.path("payload").path("episodeId").asText().equals("episode-1")
                    && lowStock.path("payload").path("managerUserId").asLong() == 21L, "Low-stock outbox lost episode or recipient");
            checkCombo(jdbc, events);
            System.out.println("Admin catalog self-check passed");
        } finally { SecurityContextHolder.clearContext(); }
    }

    private static void checkCombo(RecordingJdbc jdbc, CatalogEvents events) {
        var product = new com.clucky.catalogstoreservice.entity.Product();
        product.setId(1L);
        product.getOptions().add(new com.clucky.catalogstoreservice.entity.ProductOption(11L, product, "Size", "Large", java.math.BigDecimal.ZERO));
        var combo = new com.clucky.catalogstoreservice.entity.Combo();
        combo.setId(2L);
        combo.getItems().add(new com.clucky.catalogstoreservice.entity.ComboItem(3L, combo, product, 1, 11L));
        var products = (com.clucky.catalogstoreservice.repository.ProductRepository) Proxy.newProxyInstance(
                StoreRepository.class.getClassLoader(), new Class<?>[]{com.clucky.catalogstoreservice.repository.ProductRepository.class},
                (proxy, method, arguments) -> Optional.of(product));
        var combos = (com.clucky.catalogstoreservice.repository.ComboRepository) Proxy.newProxyInstance(
                StoreRepository.class.getClassLoader(), new Class<?>[]{com.clucky.catalogstoreservice.repository.ComboRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "findByIdWithItems" -> Optional.of(combo);
                    case "saveAndFlush" -> combo;
                    default -> throw new AssertionError(method.getName());
                });
        var service = new com.clucky.catalogstoreservice.service.ComboService(combos, null, products, null, null, null, new CatalogCacheService(null), events);
        var request = new com.clucky.catalogstoreservice.dto.ComboDto.Request();
        var item = new com.clucky.catalogstoreservice.dto.ComboDto.ItemDto(1L, "Chicken", 4, 11L);
        item.setId(3L);
        request.setItems(List.of(item));
        request.setExpectedVersion(jdbc.version);
        var saved = service.updateCombo(2L, request).getItems().getFirst();
        require(saved.getId() == 3L && saved.getQuantity() == 4 && saved.getOptionId() == 11L, "Combo quantity, option or row identity was lost");
        item.setOptionId(999L);
        request.setExpectedVersion(jdbc.version);
        expect(ErrorCode.VALIDATION_ERROR, () -> service.updateCombo(2L, request));
        item.setOptionId(11L);
        item.setQuantity(0);
        request.setExpectedVersion(jdbc.version);
        expect(ErrorCode.VALIDATION_ERROR, () -> service.updateCombo(2L, request));
    }

    private static final class Provider extends CloudinaryMediaAdapter {
        boolean fail = true;
        int attempts;
        Provider(MediaAssets assets) { super(new CloudinaryProperties(false, null, null, null, null), assets); }
        @Override void destroyOwned(String publicId) {
            attempts++;
            if (fail) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    private static final class RecordingJdbc extends JdbcTemplate {
        final String publicId = "clucky/products/owned";
        boolean referenced;
        boolean cleanupQueued;
        boolean deleted;
        long version;
        String envelope;
        @Override public List<Map<String, Object>> queryForList(String sql) { return queryForList(sql, new Object[0]); }
        @Override public List<Map<String, Object>> queryForList(String sql, Object... arguments) {
            return deleted ? List.of() : List.of(Map.of("id", 1L, "public_id", publicId, "secure_url", "https://example.test/owned.png", "delete_requested", cleanupQueued));
        }
        @Override public <Type> Type queryForObject(String sql, Class<Type> type, Object... arguments) { return type.cast(referenced); }
        @Override public int update(String sql, Object... arguments) {
            if (sql.contains("SET version=version+1")) {
                if (((Number) arguments[1]).longValue() != version) return 0;
                version++;
            }
            if (sql.contains("SET delete_requested=true")) cleanupQueued = true;
            if (sql.startsWith("DELETE FROM catalog_service.media_assets")) deleted = true;
            if (sql.startsWith("INSERT INTO catalog_service.catalog_event_outbox")) envelope = arguments[3].toString();
            return 1;
        }
    }

    private record ImageBytes(byte[] bytes) implements MultipartFile {
        @Override public String getName() { return "file"; }
        @Override public String getOriginalFilename() { return "image.png"; }
        @Override public String getContentType() { return "image/png"; }
        @Override public boolean isEmpty() { return bytes.length == 0; }
        @Override public long getSize() { return bytes.length; }
        @Override public byte[] getBytes() { return bytes; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(bytes); }
        @Override public void transferTo(File destination) { throw new UnsupportedOperationException(); }
    }

    private static void expect(ErrorCode code, Runnable action) {
        try { action.run(); }
        catch (ApiException failure) { require(failure.getCode() == code, "Wrong error code"); return; }
        throw new AssertionError("Expected " + code);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
