package com.clucky.identityservice.controller;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.auth.*;
import com.clucky.identityservice.service.AuthService;
import com.clucky.identityservice.service.GoogleAuthService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
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
    private final GoogleAuthService googleAuthService;

    public AuthController(AuthService authService, AuthProperties authProperties, GoogleAuthService googleAuthService) {
        this.authService = authService;
        this.authProperties = authProperties;
        this.googleAuthService = googleAuthService;
    }

    @PostMapping("/google")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(
            oneOf = {AuthResponse.class, GoogleAuthDto.Pending.class})))
    public Object google(@Valid @RequestBody GoogleAuthDto.SignIn request, HttpServletResponse response) {
        GoogleAuthService.LoginResult result = googleAuthService.login(request.idToken());
        if (result.session() == null) {
            return new GoogleAuthDto.Pending("REQUIRES_PASSWORD", result.pendingToken());
        }
        setRefreshCookie(response, result.session().refreshToken());
        return toAuthResponse(result.session());
    }

    @PostMapping("/google/complete")
    public AuthResponse completeGoogle(@Valid @RequestBody GoogleAuthDto.Complete request,
            HttpServletResponse response) {
        AuthService.AuthResult result = googleAuthService.complete(request.pendingToken(), request.password());
        setRefreshCookie(response, result.refreshToken());
        return toAuthResponse(result);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
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

