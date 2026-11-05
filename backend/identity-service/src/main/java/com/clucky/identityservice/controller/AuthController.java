package com.clucky.identityservice.controller;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.auth.*;
import com.clucky.identityservice.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
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

    public AuthController(AuthService authService, AuthProperties authProperties) {
        this.authService = authService;
        this.authProperties = authProperties;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/resend-otp")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        return authService.resendRegisterOtp(request.email());
    }

    @PostMapping("/verify-otp")
    public AuthResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest request, HttpServletResponse response) {
        AuthService.AuthResult result = authService.verifyOtp(request);
        setRefreshCookie(response, result.refreshToken());
        return toAuthResponse(result);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthService.AuthResult result = authService.login(request);
        setRefreshCookie(response, result.refreshToken());
        return toAuthResponse(result);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse response
    ) {
        AuthService.AuthResult result = authService.refresh(refreshToken);
        setRefreshCookie(response, result.refreshToken());
        return toAuthResponse(result);
    }

    @PostMapping("/logout")
    public MessageResponse logout(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse response
    ) {
        authService.logout(refreshToken);
        clearRefreshCookie(response);
        return new MessageResponse("Đăng xuất thành công.");
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletResponse response
    ) {
        MessageResponse res = authService.resetPassword(request);
        clearRefreshCookie(response);
        return res;
    }

    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(authProperties.cookie().secure())
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(authProperties.refreshTtl().toSeconds())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(authProperties.cookie().secure())
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private AuthResponse toAuthResponse(AuthService.AuthResult result) {
        return new AuthResponse(
                result.accessToken(),
                result.user().getRole(),
                result.user().getStoreId(),
                result.user().getEmail(),
                result.user().getFullName()
        );
    }
}

