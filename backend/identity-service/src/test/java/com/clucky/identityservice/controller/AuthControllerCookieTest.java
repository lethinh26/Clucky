package com.clucky.identityservice.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.dto.auth.AuthResponse;
import com.clucky.identityservice.dto.auth.GoogleAuthDto;
import com.clucky.identityservice.dto.auth.LoginRequest;
import com.clucky.identityservice.dto.auth.MessageResponse;
import com.clucky.identityservice.dto.auth.ResetPasswordRequest;
import com.clucky.identityservice.dto.auth.VerifyOtpRequest;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.service.AuthService;
import com.clucky.identityservice.service.GoogleAuthService;
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
    private final GoogleAuthService google = mock(GoogleAuthService.class);

    @BeforeEach
    void setUp() {
        service = new CapturingAuthService();
        AuthProperties properties = new AuthProperties(java.time.Duration.ofMinutes(30),
                java.time.Duration.ofDays(7), java.time.Duration.ofMinutes(5),
                new AuthProperties.Cookie(true), List.of("http://localhost:3000"));
        controller = new AuthController(service, properties, google);
    }

    @Test
    void googlePendingDoesNotSetCookieAndCompletedLoginUsesExistingCookieContract() {
        var request = new GoogleAuthDto.SignIn("firebase-token");
        when(google.login(request.idToken())).thenReturn(new GoogleAuthService.LoginResult(null, "p".repeat(43)));
        var pendingResponse = new MockHttpServletResponse();
        Object pendingBody = controller.google(request, "customer", pendingResponse);
        assertInstanceOf(GoogleAuthDto.Pending.class, pendingBody);
        assertNull(pendingResponse.getHeader("Set-Cookie"));

        AuthService.AuthResult session = service.login(new LoginRequest("a@example.com", "Password123"));
        when(google.login(request.idToken())).thenReturn(new GoogleAuthService.LoginResult(session, null));
        var loginResponse = new MockHttpServletResponse();
        AuthResponse loginBody = assertInstanceOf(AuthResponse.class, controller.google(request, "customer", loginResponse));
        assertEquals(1L, loginBody.userId());
        assertTrue(loginResponse.getHeader("Set-Cookie").contains("HttpOnly"));
        assertTrue(loginResponse.getHeader("Set-Cookie").contains("Secure"));
        assertTrue(loginResponse.getHeader("Set-Cookie").contains("SameSite=Lax"));

        var completeRequest = new GoogleAuthDto.Complete("p".repeat(43), "Password123");
        when(google.complete(completeRequest.pendingToken(), completeRequest.password())).thenReturn(session);
        var completeResponse = new MockHttpServletResponse();
        assertEquals(loginBody, controller.completeGoogle(completeRequest, "customer", completeResponse));
        assertEquals(loginResponse.getHeader("Set-Cookie"), completeResponse.getHeader("Set-Cookie"));
    }

    @Test
    void googleBoundaryRejectsInvalidTokenAndPasswordFields() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertFalse(validator.validate(new GoogleAuthDto.SignIn("")).isEmpty());
            assertFalse(validator.validate(new GoogleAuthDto.SignIn("x".repeat(16385))).isEmpty());
            assertFalse(validator.validate(new GoogleAuthDto.Complete("short", "Password123")).isEmpty());
            assertFalse(validator.validate(new GoogleAuthDto.Complete("p".repeat(43), "weakpassword")).isEmpty());
            assertTrue(validator.validate(new GoogleAuthDto.Complete("p".repeat(43), "Password123")).isEmpty());
        }
    }

    @Test
    void loginReturnsOnlyUserMetadataAndBothTokensInHttpOnlyCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        AuthResponse body = controller.login(new LoginRequest("a@example.com", "Password1"), "customer", response);

        assertEquals(1L, body.userId());
        assertFalse(body.toString().contains(ACCESS));
        assertEquals(Role.CUSTOMER, body.role());
        assertNull(body.storeId());
        String setCookie = response.getHeaders("Set-Cookie").stream()
                .filter(cookie -> cookie.startsWith("clucky_customer_refresh=")).findFirst().orElseThrow();
        assertNotNull(setCookie, "Refresh token must be transported as a cookie");
        assertTrue(setCookie.startsWith("clucky_customer_refresh=" + REFRESH));
        assertTrue(response.getHeaders("Set-Cookie").stream().anyMatch(cookie ->
                cookie.startsWith("clucky_customer_access=" + ACCESS) && cookie.contains("HttpOnly")
                        && cookie.contains("Path=/api;") && cookie.contains("Secure")));
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
        controller.verifyOtp(new VerifyOtpRequest("a@example.com", "123456"), "customer", response);

        String setCookie = response.getHeader("Set-Cookie");
        assertNotNull(setCookie);
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(response.getHeaders("Set-Cookie").stream().anyMatch(cookie -> cookie.contains(REFRESH)));
    }

    @Test
    void logoutClearsTheCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie("clucky_customer_refresh", REFRESH),
                new jakarta.servlet.http.Cookie("clucky_admin_refresh", "other-session"));
        MessageResponse body = controller.logout(request, "customer", response);
        assertTrue(response.getHeaders("Set-Cookie").stream().noneMatch(cookie -> cookie.startsWith("clucky_admin_")));

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
                new ResetPasswordRequest("a@example.com", "123456", "NewPassword1"), "customer", response);

        assertEquals("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", body.message());
        assertTrue(response.getHeader("Set-Cookie").contains("Max-Age=0"));
    }

    @Test
    void adminCookiesAreSeparateAndCustomerCannotSignInAsAdmin() {
        assertThrows(com.clucky.identityservice.exception.ApiException.class, () -> controller.login(
                new LoginRequest("a@example.com", "Password1"), "admin", new MockHttpServletResponse()));
        service.role = Role.ADMIN;
        var response = new MockHttpServletResponse();
        controller.login(new LoginRequest("a@example.com", "Password1"), "admin", response);
        assertTrue(response.getHeaders("Set-Cookie").stream().anyMatch(cookie -> cookie.startsWith("clucky_admin_access=")));
        assertTrue(response.getHeaders("Set-Cookie").stream().anyMatch(cookie -> cookie.startsWith("clucky_admin_refresh=")));
        assertTrue(response.getHeaders("Set-Cookie").stream().noneMatch(cookie -> cookie.startsWith("clucky_customer_")));
    }

    @Test
    void rejectedRefreshClearsOnlyTheSelectedSessionCookies() {
        service.refreshFailure = new com.clucky.identityservice.exception.ApiException(
                com.clucky.identityservice.exception.ErrorCode.TOKEN_REVOKED);
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie("clucky_customer_refresh", REFRESH));
        var response = new MockHttpServletResponse();
        assertThrows(com.clucky.identityservice.exception.ApiException.class,
                () -> controller.refresh(request, "customer", response));
        assertTrue(response.getHeaders("Set-Cookie").stream().anyMatch(cookie ->
                cookie.startsWith("clucky_customer_access=") && cookie.contains("Max-Age=0")));
        assertTrue(response.getHeaders("Set-Cookie").stream().anyMatch(cookie ->
                cookie.startsWith("clucky_customer_refresh=") && cookie.contains("Max-Age=0")));
        assertTrue(response.getHeaders("Set-Cookie").stream().noneMatch(cookie -> cookie.startsWith("clucky_admin_")));
    }

    static final class CapturingAuthService extends AuthService {
        String revokedToken;
        Role role = Role.CUSTOMER;
        RuntimeException refreshFailure;

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
            if (refreshFailure != null) throw refreshFailure;
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
            user.setRole(role);
            user.setStatus("ACTIVE");
            user.setEmailVerified(true);
            user.setCreatedAt(Instant.now());
            user.setUpdatedAt(Instant.now());
            return user;
        }
    }
}

