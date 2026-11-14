package com.clucky.identityservice.dto.auth;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record MessageResponse(String message, String challengeId) {
    public MessageResponse(String message) { this(message, null); }
}

