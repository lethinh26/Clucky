package com.clucky.identityservice.controller;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.dto.auth.*;
import com.clucky.identityservice.service.AuthService;
import com.clucky.identityservice.service.GoogleAuthService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public static final String REFRESH_COOKIE_NAME = "clucky_refresh_token";

    private final AuthService authService;
    private final AuthProperties authProperties;
    private final GoogleAuthService googleAuthService;

    public AuthController(AuthService authService, AuthProperties authProperties, GoogleAuthService googleAuthService) {
        this.authService = authService;
        this.authProperties = authProperties;
        this.googleAuthService = googleAuthService;
    }

    @PostMapping("/google")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(
            oneOf = {AuthResponse.class, GoogleAuthDto.Pending.class})))
    public Object google(@Valid @RequestBody GoogleAuthDto.SignIn request,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client,
            HttpServletResponse response) {
        GoogleAuthService.LoginResult result = googleAuthService.login(request.idToken());
        if (result.session() == null) {
            return new GoogleAuthDto.Pending("REQUIRES_PASSWORD", result.pendingToken());
        }
        setSessionCookies(response, result.session(), client);
        return toAuthResponse(result.session());
    }

    @PostMapping("/google/complete")
    public AuthResponse completeGoogle(@Valid @RequestBody GoogleAuthDto.Complete request,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client,
            HttpServletResponse response) {
        AuthService.AuthResult result = googleAuthService.complete(request.pendingToken(), request.password());
        setSessionCookies(response, result, client);
        return toAuthResponse(result);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/verify-otp")
    public AuthResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest request,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.verifyOtp(request);
        setSessionCookies(response, result, client);
        return toAuthResponse(result);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.login(request);
        setSessionCookies(response, result, client);
        return toAuthResponse(result);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(
            HttpServletRequest request,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client,
            HttpServletResponse response
    ) {
        try {
            AuthService.AuthResult result = authService.refresh(refreshCookie(request, client));
            setSessionCookies(response, result, client);
            return toAuthResponse(result);
        } catch (ApiException failure) {
            if (failure.getCode().httpStatus() == 401 || failure.getCode() == ErrorCode.ACCOUNT_LOCKED) {
                clearSessionCookies(response, client);
            }
            throw failure;
        }
    }

    @PostMapping("/logout")
    public MessageResponse logout(
            HttpServletRequest request,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client,
            HttpServletResponse response
    ) {
        try {
            authService.logout(refreshCookie(request, client));
        } catch (ApiException failure) {
            if (failure.getCode().httpStatus() != 401) throw failure;
        }
        clearSessionCookies(response, client);
        return new MessageResponse("Đăng xuất thành công.");
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client,
            HttpServletResponse response
    ) {
        MessageResponse res = authService.resetPassword(request);
        clearSessionCookies(response, client);
        return res;
    }

    @GetMapping("/session")
    public AuthResponse session(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "X-Clucky-Client", defaultValue = "customer") String client) {
        AuthResponse session = authService.session(Long.valueOf(jwt.getSubject()));
        validateRole(client, session.role());
        return session;
    }

    private String prefix(String client) {
        if (!"customer".equals(client) && !"admin".equals(client)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        return "clucky_" + client;
    }

    private void validateRole(String client, Role role) {
        prefix(client);
        boolean allowed = "customer".equals(client) ? role == Role.CUSTOMER
                : role == Role.ADMIN || role == Role.STORE_MANAGER || role == Role.STAFF;
        if (!allowed) throw new ApiException(ErrorCode.FORBIDDEN);
    }

    private String refreshCookie(HttpServletRequest request, String client) {
        String name = prefix(client) + "_refresh";
        if (request.getCookies() != null) {
            for (var cookie : request.getCookies()) {
                if (name.equals(cookie.getName())) return cookie.getValue();
            }
        }
        return null;
    }

    private void setSessionCookies(HttpServletResponse response, AuthService.AuthResult result, String client) {
        try {
            validateRole(client, result.user().getRole());
        } catch (ApiException failure) {
            authService.logout(result.refreshToken());
            throw failure;
        }
        setCookie(response, prefix(client) + "_access", result.accessToken(), "/api", authProperties.refreshTtl().toSeconds());
        setCookie(response, prefix(client) + "_refresh", result.refreshToken(), "/api/auth", authProperties.refreshTtl().toSeconds());
        setCookie(response, REFRESH_COOKIE_NAME, "", "/api/auth", 0);
    }

    private void setCookie(HttpServletResponse response, String name, String value, String path, long maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(authProperties.cookie().secure())
                .sameSite("Lax")
                .path(path)
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearSessionCookies(HttpServletResponse response, String client) {
        setCookie(response, prefix(client) + "_access", "", "/api", 0);
        setCookie(response, prefix(client) + "_refresh", "", "/api/auth", 0);
        setCookie(response, REFRESH_COOKIE_NAME, "", "/api/auth", 0);
    }

    private AuthResponse toAuthResponse(AuthService.AuthResult result) {
        return new AuthResponse(
                result.user().getId(),
                result.user().getRole(),
                result.user().getStoreId(),
                result.user().getEmail(),
                result.user().getFullName()
        );
    }
}

