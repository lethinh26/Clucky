package com.clucky.identityservice.service;

import com.clucky.identityservice.controller.NotificationContactController;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationContactTest {
    @Test
    void rejectsInvalidSignaturesAndNeverReturnsAnUnverifiedAddress() {
        var users = mock(UserRepository.class);
        var signatures = mock(OtpService.class);
        var controller = new NotificationContactController(users, signatures);
        long timestamp = Instant.now().getEpochSecond();
        assertThrows(ApiException.class, () -> controller.get(7, timestamp, "invalid"));
        assertThrows(ApiException.class, () -> controller.get(7, timestamp - 121, "a".repeat(64)));
        verifyNoInteractions(users);
        when(signatures.verifier("notification-contact-v1:7:" + timestamp)).thenReturn("a".repeat(64));
        var customer = new User(); customer.setId(7L); customer.setRole(Role.CUSTOMER);
        customer.setEmail("customer@example.com"); customer.setEmailVerified(false);
        when(users.findById(7L)).thenReturn(Optional.of(customer));
        var unverified = controller.get(7, timestamp, "a".repeat(64)).getBody();
        assertNotNull(unverified); assertFalse(unverified.emailVerified()); assertNull(unverified.email());
        customer.setEmailVerified(true);
        var verified = controller.get(7, timestamp, "a".repeat(64)).getBody();
        assertNotNull(verified); assertTrue(verified.emailVerified()); assertEquals("customer@example.com", verified.email());
        customer.setRole(Role.ADMIN);
        assertThrows(ApiException.class, () -> controller.get(7, timestamp, "a".repeat(64)));
    }
}
