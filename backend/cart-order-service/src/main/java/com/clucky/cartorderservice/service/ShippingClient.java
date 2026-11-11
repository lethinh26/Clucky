package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import java.math.BigDecimal;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class ShippingClient {
    private final RestClient restClient;
    private final String shippingServiceUrl;
    public ShippingClient(RestClient restClient, @Value("${clucky.shipping.service-url:http://shipping-service}") String url) {
        this.restClient = restClient;
        this.shippingServiceUrl = url;
    }
    public record CalculateShippingFeeRequest(Long storeId, Double latitude, Double longitude) {}
    public record ShippingFeeResult(boolean available, BigDecimal fee, String reason, Double distanceKm,
            BigDecimal radiusKm, Long policyVersion) {}

    public ShippingFeeResult calculateShippingFee(String type, Long storeId, Double latitude, Double longitude) {
        if ("PICKUP".equals(type)) return new ShippingFeeResult(true, BigDecimal.ZERO, "PICKUP", null, null, null);
        if (!"DELIVERY".equals(type)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        try {
            ShippingFeeResult result = restClient.post().uri(shippingServiceUrl + "/api/shipping/calculate-fee")
                    .contentType(MediaType.APPLICATION_JSON).body(new CalculateShippingFeeRequest(storeId, latitude, longitude))
                    .retrieve().body(ShippingFeeResult.class);
            if (result != null && Set.of("OK", "LOCATION_REQUIRED", "STORE_LOCATION_MISSING", "RADIUS_NOT_CONFIGURED",
                    "OUT_OF_RANGE", "FEE_NOT_CONFIGURED").contains(result.reason() == null ? "" : result.reason())) {
                if (!result.available()) return result;
                if ("OK".equals(result.reason()) && result.fee() != null && result.fee().signum() > 0
                        && result.fee().scale() <= 0 && result.fee().compareTo(new BigDecimal("999999999999")) <= 0
                        && result.radiusKm() != null && result.radiusKm().signum() > 0 && result.distanceKm() != null
                        && Double.isFinite(result.distanceKm()) && result.distanceKm() >= 0
                        && result.distanceKm() <= result.radiusKm().doubleValue()) return result;
            }
        } catch (RestClientException failure) {
            return new ShippingFeeResult(false, null, "UNAVAILABLE", null, null, null);
        }
        return new ShippingFeeResult(false, null, "UNAVAILABLE", null, null, null);
    }
}
