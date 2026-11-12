package com.clucky.promotionloyaltyservice.media;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.clucky.promotionloyaltyservice.config.CloudinaryProperties;
import com.clucky.promotionloyaltyservice.dto.ApiError;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CloudinaryBannerMediaAdapterTest {
    private static final String CANARY = "FAKE_CLOUDINARY_SECRET_CANARY_NOT_A_CREDENTIAL";
    private static final String KEY = "FAKE_CLOUDINARY_API_KEY";
    private final CloudinaryProperties properties = new CloudinaryProperties(true, "demo", KEY, CANARY, "clucky");
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    private final Uploader uploader = mock(Uploader.class);
    private final BannerMediaAssets assets = mock(BannerMediaAssets.class);
    private final MockMultipartFile image = pngImage();
    private final Logger logger = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();
    private CloudinaryBannerMediaAdapter adapter;

    @BeforeEach
    void setup() {
        logs.start();
        logger.addAppender(logs);
        adapter = new CloudinaryBannerMediaAdapter(properties, assets);
        Cloudinary client = mock(Cloudinary.class);
        when(client.uploader()).thenReturn(uploader);
        ReflectionTestUtils.setField(adapter, "cloudinary", client);
    }

    @AfterEach
    void releaseLogs() {
        logger.detachAppender(logs);
        logs.stop();
        adapter.shutdown();
    }

    @Test
    void uploadsBannerImageAndRedactsCredentials() throws Exception {
        Map<String, Object> response = new HashMap<>(Map.of(
                "format", "png",
                "bytes", 128L,
                "width", 1200,
                "height", 480,
                "api_secret", CANARY
        ));
        doAnswer(call -> {
            String publicId = (String) ((Map<?, ?>) call.getArgument(1)).get("public_id");
            response.put("public_id", publicId);
            response.put("secure_url", "https://res.cloudinary.com/demo/image/upload/" + publicId + ".png");
            return response;
        }).when(uploader).upload(any(byte[].class), anyMap());

        var uploaded = adapter.uploadBannerImage(image);
        assertTrue(uploaded.publicId().startsWith("clucky/banners/"));
        assertEquals("https://res.cloudinary.com/demo/image/upload/" + uploaded.publicId() + ".png", uploaded.secureUrl());
        verify(assets).reserve(uploaded.publicId());
        verify(assets).uploaded(uploaded.publicId(), uploaded.secureUrl());
        verify(assets, never()).attach(anyString());

        String serializedConfig = mapper.writeValueAsString(properties);
        assertFalse(serializedConfig.contains(CANARY));
        assertFalse(serializedConfig.contains(KEY));
        assertFalse(properties.toString().contains(CANARY));
    }

    @Test
    void validatesSizeBoundaryMimeSpoofingAndOwnership() throws Exception {
        var empty = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);
        assertEquals(ErrorCode.VALIDATION_ERROR,
                assertThrows(ApiException.class, () -> adapter.validateImageFile(empty)).getCode());

        byte[] overLimit = new byte[(int) CloudinaryBannerMediaAdapter.MAX_FILE_SIZE + 1];
        var tooLarge = new MockMultipartFile("file", "big.png", "image/png", overLimit);
        assertEquals(ErrorCode.REQUEST_TOO_LARGE,
                assertThrows(ApiException.class, () -> adapter.validateImageFile(tooLarge)).getCode());

        var textFile = new MockMultipartFile("file", "note.txt", "text/plain", new byte[]{1, 2, 3});
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE,
                assertThrows(ApiException.class, () -> adapter.validateImageFile(textFile)).getCode());

        var spoofedExtension = new MockMultipartFile("file", "fake.jpg", "image/png", image.getBytes());
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE,
                assertThrows(ApiException.class, () -> adapter.validateImageFile(spoofedExtension)).getCode());

        var spoofedBytes = new MockMultipartFile("file", "fake.png", "image/png", new byte[]{1, 2, 3, 4});
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE,
                assertThrows(ApiException.class, () -> adapter.validateImageFile(spoofedBytes)).getCode());

        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> adapter.destroyOwned("clucky/products/123")).getCode());
        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> adapter.destroyOwned("other/banners/123")).getCode());
        verifyNoInteractions(uploader, assets);
    }

    @Test
    void rejectsDisabledProviderAndStripsUpstreamSecretsFromErrorsAndLogs() throws Exception {
        var disabled = new CloudinaryBannerMediaAdapter(new CloudinaryProperties(false, null, null, null, null), assets);
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE,
                assertThrows(ApiException.class, () -> disabled.uploadBannerImage(image)).getCode());
        disabled.shutdown();

        doThrow(new IOException(CANARY)).when(uploader).upload(any(byte[].class), anyMap());
        ApiException failure = assertThrows(ApiException.class, () -> adapter.uploadBannerImage(image));
        assertEquals(ErrorCode.UPSTREAM_ERROR, failure.getCode());
        assertNull(failure.getCause());
        assertFalse(mapper.writeValueAsString(ApiError.of(failure.getCode(), "/api/promotions/banners")).contains(CANARY));

        for (ILoggingEvent entry : logs.list) {
            assertFalse(entry.getFormattedMessage().contains(CANARY));
            assertNull(entry.getThrowableProxy());
        }
    }

    @Test
    void rejectsInvalidProviderMetadataAndMarksOrphan() throws Exception {
        doAnswer(call -> {
            String publicId = (String) ((Map<?, ?>) call.getArgument(1)).get("public_id");
            return Map.of(
                    "secure_url", "http://res.cloudinary.com/demo/image/upload/" + publicId + ".png",
                    "public_id", publicId,
                    "format", "png",
                    "bytes", new BigDecimal("100"),
                    "width", 100,
                    "height", 100
            );
        }).when(uploader).upload(any(byte[].class), anyMap());

        ApiException failure = assertThrows(ApiException.class, () -> adapter.uploadBannerImage(image));
        assertEquals(ErrorCode.UPSTREAM_ERROR, failure.getCode());
        verify(assets).retireOrphan(argThat(id -> id.startsWith("clucky/banners/")));
    }

    private static MockMultipartFile pngImage() {
        try {
            var bytes = new ByteArrayOutputStream();
            ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
            return new MockMultipartFile("file", "banner.png", "image/png", bytes.toByteArray());
        } catch (IOException failure) {
            throw new AssertionError(failure);
        }
    }
}

