package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.google.firebase.auth.AuthErrorCode;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class FirebaseIdentityVerifierTest {
    private final ObjectProvider<FirebaseAuth> provider = mock(ObjectProvider.class);
    private final FirebaseAuth auth = mock(FirebaseAuth.class);
    private final FirebaseToken token = mock(FirebaseToken.class);
    private final FirebaseIdentityVerifier verifier = new FirebaseIdentityVerifier(provider);

    @BeforeEach
    void setUp() throws Exception {
        when(provider.getIfAvailable()).thenReturn(auth);
        when(auth.verifyIdToken("signed-token", true)).thenReturn(token);
        when(token.getUid()).thenReturn("uid");
        when(token.getEmail()).thenReturn(" Customer@Example.com ");
        when(token.isEmailVerified()).thenReturn(true);
        when(token.getName()).thenReturn("Customer");
        when(token.getClaims()).thenReturn(Map.of("firebase", Map.of("sign_in_provider", "google.com")));
    }

    @Test
    void usesAdminVerificationWithRevocationAndNormalizedIdentity() throws Exception {
        var identity = verifier.verify("signed-token");
        assertEquals("customer@example.com", identity.email());
        assertEquals("uid", identity.uid());
        verify(auth).verifyIdToken("signed-token", true);
    }

    @Test
    void disabledConfigurationFailsClosed() {
        when(provider.getIfAvailable()).thenReturn(null);
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> verifier.verify("signed-token")).getCode());
    }

    @Test
    void onlyVerifiedGoogleIdentityIsAccepted() {
        when(token.isEmailVerified()).thenReturn(false);
        assertRejected();
        when(token.isEmailVerified()).thenReturn(true);
        when(token.getClaims()).thenReturn(Map.of("firebase", Map.of("sign_in_provider", "password")));
        assertRejected();
        when(token.getClaims()).thenReturn(Map.of("firebase", Map.of("sign_in_provider", "google.com")));
        when(token.getTenantId()).thenReturn("foreign-tenant");
        assertRejected();
    }

    @Test
    void invalidRevokedDisabledAndExpiredTokensAreRejected() throws Exception {
        for (AuthErrorCode code : new AuthErrorCode[]{AuthErrorCode.INVALID_ID_TOKEN,
                AuthErrorCode.EXPIRED_ID_TOKEN, AuthErrorCode.REVOKED_ID_TOKEN, AuthErrorCode.USER_DISABLED}) {
            FirebaseAuthException failure = mock(FirebaseAuthException.class);
            when(failure.getAuthErrorCode()).thenReturn(code);
            doThrow(failure).when(auth).verifyIdToken("signed-token", true);
            assertRejected();
        }
    }

    @Test
    void certificateOutageIsNotReportedAsBadCredentials() throws Exception {
        FirebaseAuthException failure = mock(FirebaseAuthException.class);
        when(failure.getAuthErrorCode()).thenReturn(AuthErrorCode.CERTIFICATE_FETCH_FAILED);
        doThrow(failure).when(auth).verifyIdToken("signed-token", true);
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> verifier.verify("signed-token")).getCode());
    }

    private void assertRejected() {
        assertEquals(ErrorCode.UNAUTHENTICATED, assertThrows(ApiException.class,
                () -> verifier.verify("signed-token")).getCode());
    }
}
