package com.clucky.identityservice.controller;

import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import com.clucky.identityservice.service.OtpService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NotificationContactController {
    private final UserRepository users;
    private final OtpService signatures;

    public NotificationContactController(UserRepository users, OtpService signatures) {
        this.users = users;
        this.signatures = signatures;
    }

    public record Contact(long userId, String role, String email, boolean emailVerified) {
        @Override
        public String toString() { return "Contact[email redacted]"; }
    }

    @GetMapping("/api/auth/internal/customers/{customerId}/notification-contact")
    public ResponseEntity<Contact> get(@PathVariable long customerId,
            @RequestHeader("X-Contact-Time") long timestamp, @RequestHeader("X-Contact-Signature") String signature) {
        long now = Instant.now().getEpochSecond();
        if (customerId <= 0 || timestamp < now - 120 || timestamp > now + 30 || !signature.matches("[a-f0-9]{64}")
                || !MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8),
                signatures.verifier("notification-contact-v1:" + customerId + ":" + timestamp).getBytes(StandardCharsets.UTF_8))) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        var user = users.findById(customerId).filter(candidate -> candidate.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        boolean verified = Boolean.TRUE.equals(user.getEmailVerified()) && user.getEmail() != null && !user.getEmail().isBlank();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new Contact(user.getId(), "CUSTOMER", verified ? user.getEmail() : null, verified));
    }
}
