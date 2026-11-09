package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import java.math.BigDecimal;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class LoyaltyClient {
    private final RestClient client;
    private final String url;
    private final String token;
    public LoyaltyClient(RestClient client, @Value("${clucky.promotion.service-url:http://promotion-loyalty-service}") String url,
            @Value("${clucky.loyalty.internal-token:}") String token) {
        var factory = new org.springframework.http.client.JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build());
        factory.setReadTimeout(java.time.Duration.ofSeconds(10));
        this.client = client.mutate().requestFactory(factory).build(); this.url = url; this.token = token;
    }
    public record Quote(long policyVersion, int availablePoints, int pointsUsed, BigDecimal pointsAmount,
            int pointsToEarn, String tier, BigDecimal tierDiscount) {}
    public Quote preview(Integer requested, BigDecimal amount) {
        int points = requested == null ? 0 : requested;
        if (points < 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken)) {
            if (points > 0) throw new ApiException(ErrorCode.UNAUTHENTICATED);
            return new Quote(0, 0, 0, BigDecimal.ZERO, 0, "MEMBER", BigDecimal.ZERO);
        }
        return call("preview", Map.of("customerId", CurrentActor.require().userId(), "pointsToRedeem", points, "orderAmount", amount));
    }
    public void reserve(long orderId, long customerId, BigDecimal amount, Quote quote) {
        call("reserve", Map.of("orderId", orderId, "customerId", customerId, "pointsToRedeem", quote.pointsUsed(), "orderAmount", amount,
                "policyVersion", quote.policyVersion(), "pointsAmount", quote.pointsAmount(), "tierDiscount", quote.tierDiscount()));
    }
    private Quote call(String action, Object input) {
        try {
            Quote result = client.post().uri(url + "/internal/loyalty/" + action).header("X-Loyalty-Service-Token", token)
                    .body(input).retrieve().body(Quote.class);
            if (result == null || result.policyVersion() <= 0 || result.pointsUsed() < 0 || result.pointsAmount() == null || result.tierDiscount() == null
                    || result.pointsAmount().signum() < 0 || result.tierDiscount().signum() < 0) throw new IllegalStateException("Invalid loyalty response");
            return result;
        } catch (RestClientResponseException failure) {
            if (failure.getStatusCode().value() == 409) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            if (failure.getStatusCode().value() == 400) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (Exception failure) { throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE); }
    }
}
