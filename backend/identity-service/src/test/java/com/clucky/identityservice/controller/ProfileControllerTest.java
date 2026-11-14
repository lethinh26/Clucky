package com.clucky.identityservice.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.clucky.identityservice.entity.Address;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.AddressRepository;
import com.clucky.identityservice.repository.UserRepository;
import com.clucky.identityservice.service.IdentityChallenges;
import com.clucky.identityservice.service.OtpService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class ProfileControllerTest {
    private final UserRepository users = mock(UserRepository.class);
    private final AddressRepository addresses = mock(AddressRepository.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final ProfileController controller = new ProfileController(users, addresses, entityManager);
    private final Jwt jwt = Jwt.withTokenValue("test").header("alg", "HS256").subject("7").build();

    private void owner() {
        User user = new User(); user.setId(7L); user.setStatus("ACTIVE");
        when(entityManager.find(User.class, 7L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(user);
    }

    @Test
    void cannotOverwriteAnotherUsersAddress() {
        owner();
        when(addresses.findByIdAndUserId(10L, 7L)).thenReturn(Optional.empty());
        var input = new ProfileController.AddressInput("Customer", "0900000000", "", "", "", "123 Street", false, null, null);
        var error = assertThrows(ResponseStatusException.class, () -> controller.updateAddress(jwt, 10L, input));
        assertEquals(404, error.getStatusCode().value());
        verify(addresses, never()).saveAndFlush(any());
    }

    @Test
    void newDefaultClearsPreviousDefaultBeforeInsert() {
        owner();
        Address previous = new Address(); previous.setId(9L); previous.setIsDefault(true);
        when(addresses.findByUserIdOrderByIdAsc(7L)).thenReturn(List.of(previous));
        when(addresses.saveAndFlush(any(Address.class))).thenAnswer(call -> {
            Address saved = call.getArgument(0);
            assertFalse(previous.getIsDefault()); saved.setId(10L); return saved;
        });
        var input = new ProfileController.AddressInput("Customer", "0900000000", "", "", "", "123 Street", true, 10.0, 106.0);
        var saved = controller.create(jwt, input);
        assertTrue(saved.isDefault()); assertEquals(10.0, saved.latitude());
        var order = inOrder(addresses); order.verify(addresses).findByUserIdOrderByIdAsc(7L);
        order.verify(addresses).flush(); order.verify(addresses).saveAndFlush(any(Address.class));
    }

    @Test
    void deletingDefaultPromotesAnOwnedRemainingAddress() {
        owner();
        Address removed = new Address(); removed.setId(9L); removed.setIsDefault(true);
        Address remaining = new Address(); remaining.setId(10L); remaining.setIsDefault(false);
        when(addresses.findByIdAndUserId(9L, 7L)).thenReturn(Optional.of(removed));
        when(addresses.findByUserIdOrderByIdAsc(7L)).thenReturn(List.of(remaining));
        controller.delete(jwt, 9L);
        assertTrue(remaining.getIsDefault()); verify(addresses).delete(removed);
    }

    @Test
    void coordinatePairMustBeCompleteAndFinite() {
        assertFalse(new ProfileController.AddressInput("Customer", "0900000000", "", "", "", "Street", false, 10.0, null).isCoordinatePairValid());
        assertFalse(new ProfileController.AddressInput("Customer", "0900000000", "", "", "", "Street", false, Double.NaN, 106.0).isCoordinatePairValid());
        assertTrue(new ProfileController.AddressInput("Customer", "0900000000", "", "", "", "Street", false, null, null).isCoordinatePairValid());
    }

    @Test
    void emailBindingRequiresCurrentPasswordBeforeAnyOtpConfirmation() {
        var challenges = mock(IdentityChallenges.class);
        var encoder = mock(PasswordEncoder.class);
        var otp = mock(OtpService.class);
        var account = customerForContactChange();
        var guarded = new ProfileController(users, addresses, entityManager, challenges, encoder, otp);

        var rejected = assertThrows(ApiException.class, () -> guarded.verifyEmail(jwt,
                new ProfileController.EmailBindConfirm("new@example.com", "123456", "challenge-id", "wrong")));
        assertEquals(ErrorCode.VALIDATION_ERROR, rejected.getCode());
        assertEquals("INVALID", rejected.getFieldErrors().get("currentPassword"));
        verify(challenges, never()).confirmEmailBinding(any(), anyString(), anyString(), anyString());
        verify(otp).limitVerification("account:7", "CONTACT_BIND_PASSWORD");

        when(encoder.matches("correct-password", "stored-hash")).thenReturn(true);
        guarded.verifyEmail(jwt, new ProfileController.EmailBindConfirm(
                "new@example.com", "123456", "challenge-id", "correct-password"));
        verify(challenges).confirmEmailBinding(account, "new@example.com", "challenge-id", "123456");
    }

    @Test
    void firstPhoneBindingOnGoogleAccountAlsoRequiresCurrentPassword() {
        var challenges = mock(IdentityChallenges.class);
        var encoder = mock(PasswordEncoder.class);
        var otp = mock(OtpService.class);
        var account = customerForContactChange();
        account.setPhone(null);
        var guarded = new ProfileController(users, addresses, entityManager, challenges, encoder, otp);

        var rejected = assertThrows(ApiException.class, () -> guarded.verifyPhone(jwt,
                new ProfileController.PhoneBindConfirm("+84901234567", "123456", "challenge-id", "")));
        assertEquals("INVALID", rejected.getFieldErrors().get("currentPassword"));
        verify(challenges, never()).confirmPhoneBinding(any(), anyString(), anyString(), anyString());

        when(encoder.matches("correct-password", "stored-hash")).thenReturn(true);
        guarded.verifyPhone(jwt, new ProfileController.PhoneBindConfirm(
                "+84901234567", "123456", "challenge-id", "correct-password"));
        verify(challenges).confirmPhoneBinding(account, "+84901234567", "challenge-id", "123456");
    }

    @Test
    void passwordStepUpRateLimitPreventsContactBindingBeforeBcrypt() {
        var challenges = mock(IdentityChallenges.class);
        var encoder = mock(PasswordEncoder.class);
        var otp = mock(OtpService.class);
        customerForContactChange();
        doThrow(new ApiException(ErrorCode.TOO_MANY_REQUESTS)).when(otp)
                .limitVerification("account:7", "CONTACT_BIND_PASSWORD");
        var guarded = new ProfileController(users, addresses, entityManager, challenges, encoder, otp);

        assertEquals(ErrorCode.TOO_MANY_REQUESTS, assertThrows(ApiException.class,
                () -> guarded.verifyEmail(jwt, new ProfileController.EmailBindConfirm(
                        "new@example.com", "123456", "challenge-id", "correct-password"))).getCode());
        verifyNoInteractions(encoder, challenges);
    }

    private User customerForContactChange() {
        User account = new User();
        account.setId(7L);
        account.setStatus("ACTIVE");
        account.setEmail("existing@example.com");
        account.setPasswordHash("stored-hash");
        account.setPhone("+84901111111");
        when(entityManager.find(User.class, 7L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(account);
        when(users.findById(7L)).thenReturn(Optional.of(account));
        return account;
    }
}
