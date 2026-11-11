package com.clucky.catalogstoreservice.media;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.clucky.catalogstoreservice.config.CloudinaryProperties;
import com.clucky.catalogstoreservice.dto.ApiError;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CloudinaryMediaAdapterTest {
    private static final String CANARY = "FAKE_CLOUDINARY_SECRET_CANARY_NOT_A_CREDENTIAL";
    private static final String KEY = "FAKE_CLOUDINARY_API_KEY";
    private final CloudinaryProperties properties = new CloudinaryProperties(true, "demo", KEY, CANARY, "clucky");
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    private final Uploader uploader = mock(Uploader.class);
    private final MockMultipartFile image = image();
    private final MediaAssets assets = mock(MediaAssets.class);
    private final Logger logger = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();
    private CloudinaryMediaAdapter adapter;

    @BeforeEach
    void setup() {
        logs.start();
        logger.addAppender(logs);
        adapter = new CloudinaryMediaAdapter(properties, assets);
        Cloudinary client = mock(Cloudinary.class);
        when(client.uploader()).thenReturn(uploader);
        ReflectionTestUtils.setField(adapter, "cloudinary", client);
    }

    @AfterEach
    void releaseLogs() {
        logger.detachAppender(logs);
        logs.stop();
    }

    @Test
    void returnsOnlyValidatedMetadataAndDoesNotSerializeCredentials() throws Exception {
        Map<String, Object> response = metadata();
        response.put("api_secret", CANARY);
        response.put("signature", CANARY);
        response.put("provider_debug", Map.of("credential", CANARY));
        doAnswer(call -> {
            response.put("public_id", ((Map<?, ?>) call.getArgument(1)).get("public_id"));
            response.put("secure_url", "https://res.cloudinary.com/demo/image/upload/" + response.get("public_id") + ".png");
            return response;
        }).when(uploader).upload(any(byte[].class), anyMap());
        var uploaded = adapter.uploadImage(image, "products");
        var json = mapper.valueToTree(uploaded);
        Set<String> fields = new java.util.HashSet<>();
        json.fieldNames().forEachRemaining(fields::add);
        assertEquals(Set.of("secureUrl", "publicId", "format", "sizeBytes", "width", "height"), fields);
        assertEquals("https://res.cloudinary.com/demo/image/upload/" + uploaded.getPublicId() + ".png", uploaded.getSecureUrl());
        assertTrue(uploaded.getPublicId().startsWith("clucky/products/"));
        verify(assets).reserve(uploaded.getPublicId());
        verify(assets).uploaded(uploaded.getPublicId(), uploaded.getSecureUrl());
        verify(assets).attach(uploaded.getPublicId());
        assertEquals(640, uploaded.getWidth().intValue());
        assertFalse(json.toString().contains(CANARY));
        String configuration = mapper.writeValueAsString(properties);
        assertFalse(configuration.contains(CANARY));
        assertFalse(configuration.contains(KEY));
        assertFalse(configuration.contains("apiSecret"));
        assertFalse(configuration.contains("apiKey"));
        assertFalse(properties.toString().contains(CANARY));
        assertFalse(properties.toString().contains(KEY));
    }

    @Test
    void rejectsMissingMalformedAndOverflowingProviderMetadata() throws Exception {
        Object[][] invalid = {
                {"secure_url", null}, {"secure_url", 123}, {"secure_url", " "},
                {"secure_url", "http://example.test/image.png"}, {"secure_url", "https://"},
                {"secure_url", "https://user:password@example.test/image.png"},
                {"secure_url", "https://example.test/image.png?api_secret=" + CANARY},
                {"secure_url", "https://example.test/image.png#" + CANARY},
                {"public_id", null}, {"public_id", List.of("sample")}, {"public_id", " "},
                {"public_id", "sample\n" + CANARY}, {"public_id", "a".repeat(256)},
                {"format", Map.of("secret", CANARY)}, {"bytes", "3"}, {"bytes", -1},
                {"bytes", new BigDecimal("9223372036854775808")}, {"width", 0},
                {"width", new BigDecimal("1.5")}, {"height", Double.NaN},
                {"height", (long) Integer.MAX_VALUE + 1}
        };
        for (Object[] fixture : invalid) {
            Map<String, Object> response = metadata();
            doAnswer(call -> {
                response.put("public_id", ((Map<?, ?>) call.getArgument(1)).get("public_id"));
                response.put("secure_url", "https://res.cloudinary.com/demo/image/upload/" + response.get("public_id") + ".png");
                response.put((String) fixture[0], fixture[1]);
                return response;
            }).when(uploader).upload(any(byte[].class), anyMap());
            ApiException failure = assertThrows(ApiException.class, () -> adapter.uploadImage(image, "products"));
            assertEquals(ErrorCode.UPSTREAM_ERROR, failure.getCode());
            assertNull(failure.getCause());
        }
        doReturn(null).when(uploader).upload(any(byte[].class), anyMap());
        assertThrows(ApiException.class, () -> adapter.uploadImage(image, "products"));
    }

    @Test
    void rejectsIncompleteProviderMetadataInsteadOfInventingSuccess() throws Exception {
        doAnswer(call -> {
            Object publicId = ((Map<?, ?>) call.getArgument(1)).get("public_id");
            return Map.of("secure_url", "https://res.cloudinary.com/demo/image/upload/" + publicId + ".png", "public_id", publicId);
        }).when(uploader).upload(any(byte[].class), anyMap());
        assertEquals(ErrorCode.UPSTREAM_ERROR,
                assertThrows(ApiException.class, () -> adapter.uploadImage(image, "combos")).getCode());
    }

    @Test
    void stripsProviderFailureDetailsFromErrorsAndLogs() throws Exception {
        for (Exception providerFailure : List.of(new IOException(CANARY), new IllegalStateException(CANARY))) {
            doThrow(providerFailure).when(uploader).upload(any(byte[].class), anyMap());
            ApiException failure = assertThrows(ApiException.class, () -> adapter.uploadImage(image, "products"));
            assertEquals(ErrorCode.UPSTREAM_ERROR, failure.getCode());
            assertNull(failure.getCause());
            assertFalse(mapper.writeValueAsString(ApiError.of(failure.getCode(), "/api/catalog/products/1/image")).contains(CANARY));
        }
        doThrow(new IOException(CANARY)).when(uploader).destroy(anyString(), anyMap());
        assertEquals(ErrorCode.UPSTREAM_ERROR, assertThrows(ApiException.class, () -> adapter.destroyOwned("clucky/products/sample")).getCode());
        doReturn(Map.of("result", CANARY)).when(uploader).destroy(anyString(), anyMap());
        assertEquals(ErrorCode.UPSTREAM_ERROR, assertThrows(ApiException.class, () -> adapter.destroyOwned("clucky/products/sample")).getCode());
        for (ILoggingEvent entry : logs.list) {
            assertFalse(entry.getFormattedMessage().contains(CANARY));
            assertNull(entry.getThrowableProxy());
        }
    }

    @Test
    void validatesInputAndDisabledProviderWithoutMakingRequests() {
        ApiException empty = assertThrows(ApiException.class, () -> adapter.uploadImage(null, "products"));
        assertEquals(ErrorCode.VALIDATION_ERROR, empty.getCode());
        var unsupported = new MockMultipartFile("file", "sample.txt", "text/plain", new byte[]{1});
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE,
                assertThrows(ApiException.class, () -> adapter.uploadImage(unsupported, "products")).getCode());
        var disabled = new CloudinaryMediaAdapter(new CloudinaryProperties(false, null, null, null, null), assets);
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE,
                assertThrows(ApiException.class, () -> disabled.uploadImage(image, "products")).getCode());
        verifyNoInteractions(uploader);
    }

    private Map<String, Object> metadata() {
        return new HashMap<>(Map.of("secure_url", "https://res.cloudinary.com/demo/image/upload/sample.png",
                "public_id", "clucky/products/sample", "format", "png", "bytes", 3L, "width", 640, "height", 480));
    }

    private static MockMultipartFile image() {
        try {
            var bytes = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(1, 1, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", bytes);
            return new MockMultipartFile("file", "sample.png", "image/png", bytes.toByteArray());
        } catch (IOException failure) { throw new AssertionError(failure); }
    }

    @Test
    void rejectsSpoofedImageBytesAndForeignReferences() {
        var spoofed = new MockMultipartFile("file", "sample.png", "image/png", new byte[]{1, 2, 3});
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE, assertThrows(ApiException.class, () -> adapter.uploadImage(spoofed, "products")).getCode());
        assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                () -> CloudinaryMediaAdapter.requireUnchangedImage("https://example.test/foreign.png", "foreign", null, null)).getCode());
        verifyNoInteractions(uploader, assets);
    }
}
