package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.dto.Role;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CustomerProfileClient {
    private final RestClient client;
    private final String url;
    private final com.clucky.cartorderservice.config.JwtSettings settings;
    public CustomerProfileClient(RestClient client, @Value("${clucky.identity.service-url:http://identity-service}") String url,
            com.clucky.cartorderservice.config.JwtSettings settings) {
        var factory = new org.springframework.http.client.JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(5)).build());
        factory.setReadTimeout(java.time.Duration.ofSeconds(10));
        this.client = client.mutate().requestFactory(factory).build(); this.url = url;
        this.settings = settings;
    }
    public record Contact(long userId, String role, String email, boolean emailVerified) {
        @Override public String toString() { return "Contact[email redacted]"; }
    }
    public String currentCustomerEmail(Long customerId) {
        var actor = CurrentActor.require();
        if (actor.role() != Role.CUSTOMER || !actor.userId().equals(customerId)) throw new ApiException(ErrorCode.FORBIDDEN);
        // A phone-verified customer may not have added an email yet. Ordering must
        // remain available; email notifications are optional until email verification.
        var contact = contact(customerId);
        return contact.emailVerified() ? contact.email() : null;
    }

    public Contact verifiedContact(Long customerId) {
        var contact = contact(customerId);
        if (!contact.emailVerified()) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        return contact;
    }

    private Contact contact(Long customerId) {
        if (customerId == null || customerId <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        try {
            byte[] key = settings.secret() == null ? new byte[0] : settings.secret().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (key.length < 32) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
            long timestamp = java.time.Instant.now().getEpochSecond();
            var mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(key, "HmacSHA256"));
            String signature = java.util.HexFormat.of().formatHex(mac.doFinal(("notification-contact-v1:" + customerId + ":" + timestamp)
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            var contact = client.get().uri(url + "/api/auth/internal/customers/" + customerId + "/notification-contact")
                    .header("X-Contact-Time", Long.toString(timestamp)).header("X-Contact-Signature", signature).retrieve().body(Contact.class);
            if (contact == null || contact.userId() != customerId || !"CUSTOMER".equals(contact.role()))
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            if (contact.emailVerified() && (contact.email() == null || contact.email().length() > 255
                    || !contact.email().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")))
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            if (!contact.emailVerified() && contact.email() != null)
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            return contact;
        } catch (ApiException failure) { throw failure;
        } catch (Exception failure) { throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE); }
    }
}
