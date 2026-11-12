package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.JwtSettings;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class EmailPayloadCodec {
    private final byte[] encryptionKey;
    private final byte[] fingerprintKey;
    private final SecureRandom random = new SecureRandom();

    public EmailPayloadCodec(JwtSettings settings) {
        if (settings.secret() == null || settings.secret().length() < 32) {
            throw new IllegalArgumentException("Email snapshots require the configured backend secret");
        }
        // ponytail: bounded-lived snapshots use domain-separated JWT key derivation; add a key ring before rotating keys with pending mail.
        encryptionKey = hmac(settings.secret().getBytes(StandardCharsets.UTF_8), "clucky/email/encryption/v1");
        fingerprintKey = hmac(settings.secret().getBytes(StandardCharsets.UTF_8), "clucky/email/fingerprint/v1");
    }

    public String fingerprint(String command) {
        return HexFormat.of().formatHex(hmac(fingerprintKey, command));
    }

    public String encrypt(String messageId, String plaintext) {
        try {
            byte[] nonce = new byte[12];
            random.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(encryptionKey, "AES"), new GCMParameterSpec(128, nonce));
            cipher.updateAAD(messageId.getBytes(StandardCharsets.UTF_8));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return "v1:" + Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + encrypted.length)
                    .put(nonce).put(encrypted).array());
        } catch (Exception failure) {
            throw new IllegalStateException("Email snapshot encryption failed");
        }
    }

    public String decrypt(String messageId, String snapshot) {
        try {
            if (snapshot == null || !snapshot.startsWith("v1:")) throw new IllegalArgumentException();
            ByteBuffer bytes = ByteBuffer.wrap(Base64.getDecoder().decode(snapshot.substring(3)));
            byte[] nonce = new byte[12];
            bytes.get(nonce);
            byte[] encrypted = new byte[bytes.remaining()];
            bytes.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(encryptionKey, "AES"), new GCMParameterSpec(128, nonce));
            cipher.updateAAD(messageId.getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception failure) {
            throw new IllegalStateException("Email snapshot unavailable");
        }
    }

    private byte[] hmac(byte[] key, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception failure) {
            throw new IllegalStateException("Email fingerprint unavailable");
        }
    }
}
