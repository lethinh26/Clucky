package com.clucky.identityservice.controller;

import static org.junit.jupiter.api.Assertions.*;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.dto.auth.AuthResponse;
import com.clucky.identityservice.dto.auth.LoginRequest;
import com.clucky.identityservice.dto.auth.MessageResponse;
import com.clucky.identityservice.dto.auth.ResetPasswordRequest;
import com.clucky.identityservice.dto.auth.VerifyOtpRequest;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.service.AuthService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthControllerCookieTest {
    private static final String ACCESS = "access-token-value";
    private static final String REFRESH = "refresh-token-value";

    private CapturingAuthService service;
    private AuthController controller;

    @BeforeEach
    void setUp() {
        service = new CapturingAuthService();
        AuthProperties properties = new AuthProperties(java.time.Duration.ofMinutes(30),
                java.time.Duration.ofDays(7), java.time.Duration.ofMinutes(5),
                new AuthProperties.Cookie(true), List.of("http://localhost:3000"));
        controller = new AuthController(service, properties);
    }

    @Test
    void loginReturnsAccessTokenInBodyAndRefreshInHttpOnlyCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        AuthResponse body = controller.login(new LoginRequest("a@example.com", "Password1"), response);

        assertEquals(ACCESS, body.accessToken());
        assertEquals(Role.CUSTOMER, body.role());
        assertNull(body.storeId());
        String setCookie = response.getHeader("Set-Cookie");
        assertNotNull(setCookie, "Refresh token must be transported as a cookie");
        assertTrue(setCookie.startsWith(AuthController.REFRESH_COOKIE_NAME + "=" + REFRESH));
        assertTrue(setCookie.contains("HttpOnly"), "Refresh cookie must be HttpOnly");
        assertTrue(setCookie.contains("Secure"), "Secure flag must follow configuration");
        assertTrue(setCookie.contains("SameSite=Lax"));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("Max-Age=604800"), "Cookie lifetime must mirror the refresh TTL");
        assertFalse(body.toString().contains(REFRESH), "Refresh token must never be in the response body");
    }

    @Test
    void verifyOtpAlsoSetsHttpOnlyCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.verifyOtp(new VerifyOtpRequest("a@example.com", "123456"), response);

        String setCookie = response.getHeader("Set-Cookie");
        assertNotNull(setCookie);
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains(REFRESH));
    }

    @Test
    void logoutClearsTheCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MessageResponse body = controller.logout(REFRESH, response);

        String setCookie = response.getHeader("Set-Cookie");
        assertTrue(setCookie.contains("Max-Age=0"), "Logout must expire the refresh cookie");
        assertTrue(setCookie.contains("HttpOnly"));
        assertEquals(REFRESH, service.revokedToken, "Logout must revoke the presented session");
        assertNotNull(body.message());
    }

    @Test
    void resetPasswordClearsCookieAndReturnsApprovedMessage() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MessageResponse body = controller.resetPassword(
                new ResetPasswordRequest("a@example.com", "123456", "NewPassword1"), response);

        assertEquals("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", body.message());
        assertTrue(response.getHeader("Set-Cookie").contains("Max-Age=0"));
    }

    /** Stubs the service so the controller's transport contract can be asserted in isolation. */
    static final class CapturingAuthService extends AuthService {
        String revokedToken;

        CapturingAuthService() {
            super(null, null, null, null, null, null, null);
        }

        @Override
        public AuthResult login(LoginRequest request) {
            return new AuthResult(ACCESS, REFRESH, user());
        }

        @Override
        public AuthResult verifyOtp(VerifyOtpRequest request) {
            return new AuthResult(ACCESS, REFRESH, user());
        }

        @Override
        public AuthResult refresh(String rawRefreshToken) {
            return new AuthResult(ACCESS, REFRESH, user());
        }

        @Override
        public void logout(String rawRefreshToken) {
            this.revokedToken = rawRefreshToken;
        }

        @Override
        public MessageResponse resetPassword(ResetPasswordRequest request) {
            return new MessageResponse("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
        }

        private User user() {
            User user = new User();
            user.setId(1L);
            user.setEmail("a@example.com");
            user.setFullName("Test User");
            user.setRole(Role.CUSTOMER);
            user.setStatus("ACTIVE");
            user.setEmailVerified(true);
            user.setCreatedAt(Instant.now());
            user.setUpdatedAt(Instant.now());
            return user;
        }
    }
}

