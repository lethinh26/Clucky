package com.clucky.identityservice.service;

import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class FirebaseIdentityVerifier {
    private final ObjectProvider<FirebaseAuth> firebaseAuth;

    public FirebaseIdentityVerifier(ObjectProvider<FirebaseAuth> firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    public Identity verify(String idToken) {
        FirebaseAuth auth = firebaseAuth.getIfAvailable();
        if (auth == null) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        FirebaseToken token;
        try {
            token = auth.verifyIdToken(idToken, true);
        } catch (FirebaseAuthException failure) {
            if (failure.getAuthErrorCode() == null) {
                throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
            }
            throw new ApiException(switch (failure.getAuthErrorCode()) {
                case INVALID_ID_TOKEN, EXPIRED_ID_TOKEN, REVOKED_ID_TOKEN, USER_DISABLED, USER_NOT_FOUND,
                        TENANT_ID_MISMATCH -> ErrorCode.UNAUTHENTICATED;
                default -> ErrorCode.DEPENDENCY_UNAVAILABLE;
            });
        } catch (IllegalArgumentException failure) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        Object firebase = token.getClaims().get("firebase");
        String email = AuthService.normalizeEmail(token.getEmail());
        if (!token.isEmailVerified() || email == null || email.length() > 255
                || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                || token.getUid() == null || token.getUid().isBlank() || token.getUid().length() > 128
                || token.getTenantId() != null
                || !(firebase instanceof Map<?, ?> claims)
                || !"google.com".equals(claims.get("sign_in_provider"))) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        String name = token.getName() == null || token.getName().isBlank() ? email : token.getName().trim();
        return new Identity(token.getUid(), email, name.substring(0, Math.min(name.length(), 160)));
    }

    public record Identity(String uid, String email, String fullName) {}
}
