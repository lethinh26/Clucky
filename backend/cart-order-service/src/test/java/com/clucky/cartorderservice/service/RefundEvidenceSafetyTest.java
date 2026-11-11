package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.media.CloudinaryProperties;
import com.clucky.cartorderservice.media.RefundEvidenceService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;

class RefundEvidenceSafetyTest {
    private final RefundEvidenceService service = new RefundEvidenceService(new CloudinaryProperties());

    @Test
    void forgedImagesAndUnsupportedWebpAreRejected() {
        var forged = new MockMultipartFile("file", "proof.png", "image/png", "not an image".getBytes());
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE, assertThrows(ApiException.class, () -> service.validateFile(forged)).getCode());
        var webp = new MockMultipartFile("file", "proof.webp", "image/webp", new byte[]{1});
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE, assertThrows(ApiException.class, () -> service.validateFile(webp)).getCode());
    }

    @Test
    void validImageCannotBecomeFakeEvidenceWithoutProvider() throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        var image = new MockMultipartFile("file", "proof.png", "image/png", bytes.toByteArray());
        assertDoesNotThrow(() -> service.validateFile(image));
        assertEquals(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> service.uploadEvidence(1L, 2L, java.util.UUID.randomUUID().toString(), image)).getCode());
        assertEquals(ErrorCode.EVIDENCE_DELIVERY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> service.generatePrivateDeliveryUrl("clucky/refunds/1/2/fake")).getCode());
    }
}
