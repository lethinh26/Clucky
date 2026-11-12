package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.JwtSettings;
import jakarta.mail.internet.InternetAddress;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpClientErrorException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

@Component
public class CustomerContactClient {
    private final RestClient client;
    private final JwtSettings settings;

    public CustomerContactClient(@LoadBalanced RestClient.Builder builder, JwtSettings settings) {
        var factory = new org.springframework.http.client.JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.client = builder.clone().baseUrl("http://identity-service").requestFactory(factory).build();
        this.settings = settings;
    }

    public record Contact(long userId, String role, String email, boolean emailVerified) {
        @Override public String toString() { return "Contact[redacted]"; }
    }

    public String verifiedEmail(Long customerId) {
        if (customerId == null || customerId <= 0) throw new IllegalArgumentException("Invalid customer identity");
        try {
            byte[] key = settings.secret() == null ? new byte[0] : settings.secret().getBytes(StandardCharsets.UTF_8);
            if (key.length < 32) throw new IllegalStateException();
            long timestamp = Instant.now().getEpochSecond();
            var mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(key, "HmacSHA256"));
            String signature = java.util.HexFormat.of().formatHex(mac.doFinal(
                    ("notification-contact-v1:" + customerId + ":" + timestamp).getBytes(StandardCharsets.UTF_8)));
            var contact = client.get().uri("/api/auth/internal/customers/{id}/notification-contact", customerId)
                    .header("X-Contact-Time", Long.toString(timestamp)).header("X-Contact-Signature", signature)
                    .retrieve().body(Contact.class);
            if (contact == null || contact.userId() != customerId || !"CUSTOMER".equals(contact.role())) {
                throw new IllegalStateException();
            }
            if (!contact.emailVerified()) return null;
            String email = contact.email();
            if (email == null || email.length() > 255 || email.contains("\r") || email.contains("\n")) {
                throw new IllegalStateException();
            }
            var address = new InternetAddress(email, true);
            address.validate();
            if (address.getPersonal() != null || !email.equals(address.getAddress())) throw new IllegalStateException();
            return email;
        } catch (HttpClientErrorException.NotFound missing) {
            return null;
        } catch (Exception unavailable) {
            throw new IllegalStateException("Verified customer contact unavailable");
        }
    }
}
