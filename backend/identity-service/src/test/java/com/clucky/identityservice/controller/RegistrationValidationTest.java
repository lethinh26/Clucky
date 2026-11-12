package com.clucky.identityservice.controller;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.exception.GlobalExceptionHandler;
import com.clucky.identityservice.service.AuthService;
import com.clucky.identityservice.service.GoogleAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RegistrationValidationTest {
    @Test
    void duplicateFieldsArePreservedInTheHttpErrorContract() throws Exception {
        var service = mock(AuthService.class);
        when(service.register(any())).thenThrow(
                new com.clucky.identityservice.exception.ApiException(com.clucky.identityservice.exception.ErrorCode.EMAIL_EXISTS),
                new com.clucky.identityservice.exception.ApiException(com.clucky.identityservice.exception.ErrorCode.RESOURCE_CONFLICT,
                        java.util.Map.of("phone", "ALREADY_EXISTS")));
        var mvc = MockMvcBuilders.standaloneSetup(new AuthController(service, mock(AuthProperties.class), mock(GoogleAuthService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        String request = """
                {"fullName":"Customer","email":"customer@example.com","phone":"0901234567","password":"Password1"}
                """;
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_EXISTS"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESOURCE_CONFLICT"))
                .andExpect(jsonPath("$.fieldErrors.phone").value("ALREADY_EXISTS"))
                .andExpect(jsonPath("$.fieldErrors.email").doesNotExist())
                .andExpect(content().string(not(containsString("0901234567"))));
    }

    @Test
    void invalidRegistrationIdentifiesFieldsWithoutEchoingInput() throws Exception {
        var service = mock(AuthService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new AuthController(service, mock(AuthProperties.class), mock(GoogleAuthService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON).content("""
                {"fullName":" ","email":"not-an-email","phone":"bad-phone","password":"lowercase-secret"}
                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.fullName").value("INVALID"))
                .andExpect(jsonPath("$.fieldErrors.email").value("INVALID"))
                .andExpect(jsonPath("$.fieldErrors.phone").value("INVALID"))
                .andExpect(jsonPath("$.fieldErrors.password").value("INVALID"))
                .andExpect(content().string(not(containsString("lowercase-secret"))))
                .andExpect(content().string(not(containsString("not-an-email"))))
                .andExpect(content().string(not(containsString("bad-phone"))));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors").doesNotExist());
        verifyNoInteractions(service);
    }
}
