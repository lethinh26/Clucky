package com.clucky.identityservice.service;

import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.HttpClientErrorException;

/** Bridge verifies SMS codes remotely: no OTP code or SMS provider secret is persisted. */
@Component
public final class BridgeOtpClient {
    private final RestClient client;
    private final String apiKey;

    public record Challenge(String id, Instant expiresAt) {}

    public BridgeOtpClient(RestClient.Builder builder,
            @Value("${clucky.auth.bridge.base-url:https://api.bridge.kroszborg.co}") String baseUrl,
            @Value("${clucky.auth.bridge.api-key:}") String apiKey) {
        this.apiKey = apiKey;
        var requestFactory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(7));
        this.client = builder.clone().baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    public Challenge send(String e164) {
        ensureAvailable();
        try {
            JsonNode response = client.post().uri("/v1/otp")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .body(Map.of("to", e164)).retrieve().body(JsonNode.class);
            String id = response == null ? null : response.path("id").asText(null);
            JsonNode expiry = response == null ? null : response.get("expires_at");
            if (id == null || id.isBlank() || id.length() > 160 || expiry == null || expiry.isNull()) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }
            Instant expiresAt;
            if (expiry.isIntegralNumber()) {
                long timestamp = expiry.longValue();
                expiresAt = timestamp > 10_000_000_000L
                        ? Instant.ofEpochMilli(timestamp) : Instant.ofEpochSecond(timestamp);
            } else if (expiry.isTextual()) {
                expiresAt = Instant.parse(expiry.asText());
            } else {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }
            if (!expiresAt.isAfter(Instant.now())) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            return new Challenge(id, expiresAt);
        } catch (HttpClientErrorException.TooManyRequests failure) {
            throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
        } catch (RestClientException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (java.time.format.DateTimeParseException failure) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    public void verify(String bridgeId, String code) {
        ensureAvailable();
        try {
            JsonNode response = client.post().uri("/v1/otp/verify")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .body(Map.of("id", bridgeId, "code", code))
                    .retrieve().body(JsonNode.class);
            if (response == null || !response.path("valid").asBoolean(false)) {
                throw new ApiException(ErrorCode.INVALID_OTP);
            }
        } catch (HttpClientErrorException.BadRequest | HttpClientErrorException.NotFound failure) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        } catch (HttpClientErrorException.TooManyRequests failure) {
            throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
        } catch (RestClientException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    private void ensureAvailable() {
        if (apiKey == null || apiKey.isBlank()) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
    }
}
