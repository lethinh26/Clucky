package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;

@Component
public class PromotionClient {
    private static final Logger LOG = LoggerFactory.getLogger(PromotionClient.class);

    private final RestClient restClient;
    private final String promotionServiceUrl;
    private final String serviceToken;

    public PromotionClient(
            RestClient restClient,
            @Value("${clucky.promotion.service-url:http://promotion-loyalty-service}") String promotionServiceUrl,
            @Value("${clucky.promotion.service-token:}") String serviceToken
    ) {
        this.restClient = restClient;
        this.promotionServiceUrl = promotionServiceUrl;
        this.serviceToken = serviceToken;
    }

    public record VoucherValidationRequest(
            String code,
            Long storeId,
            BigDecimal orderAmount
    ) {}

    public record VoucherValidationResponse(
            boolean valid,
            BigDecimal discountAmount,
            String reason
    ) {}

    public record VoucherResult(
            boolean valid,
            String message,
            BigDecimal discountAmount
    ) {}

    public record LoyaltyPreviewRequest(
            Integer pointsToRedeem,
            BigDecimal orderAmount
    ) {}

    public record LoyaltyPreviewResponse(
            int availablePoints,
            int pointsUsed,
            BigDecimal pointsAmount,
            int pointsToEarn,
            String tier
    ) {}

    public record LoyaltyResult(
            boolean valid,
            int pointsUsed,
            BigDecimal pointsAmount,
            String message
    ) {}

    public record VoucherReleaseRequest(
            String code,
            Long orderId,
            Long customerId
    ) {}

    public record LoyaltyReleaseRequest(
            Long customerId,
            Integer points,
            Long orderId
    ) {}

    public void releaseVoucher(String rawCode, Long orderId, Long customerId) {
        if (rawCode == null || rawCode.isBlank()) {
            return;
        }
        String code = rawCode.trim().toUpperCase();
        VoucherReleaseRequest req = new VoucherReleaseRequest(code, orderId, customerId);
        try {
            restClient.post()
                    .uri(promotionServiceUrl + "/api/promotions/vouchers/release")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .toBodilessEntity();
            LOG.info("event=voucher_released code={} orderId={} customerId={}", code, orderId, customerId);
        } catch (Exception ex) {
            LOG.warn("event=voucher_release_failed code={} orderId={} customerId={} error={}",
                    code, orderId, customerId, ex.getMessage());
        }
    }

    public void releaseLoyaltyPoints(Long customerId, Integer points, Long orderId) {
        if (customerId == null || points == null || points <= 0) {
            return;
        }
        LoyaltyReleaseRequest req = new LoyaltyReleaseRequest(customerId, points, orderId);
        try {
            restClient.post()
                    .uri(promotionServiceUrl + "/api/loyalty/release")
                    .headers(headers -> headers.setBearerAuth(serviceToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .toBodilessEntity();
            LOG.info("event=loyalty_points_released customerId={} points={} orderId={}", customerId, points, orderId);
        } catch (Exception ex) {
            LOG.warn("event=loyalty_points_release_failed customerId={} points={} orderId={} error={}",
                    customerId, points, orderId, ex.getMessage());
        }
    }

    public VoucherResult validateVoucher(String rawCode, Long storeId, BigDecimal subtotal) {
        if (rawCode == null || rawCode.isBlank()) {
            return new VoucherResult(false, null, BigDecimal.ZERO);
        }

        String code = rawCode.trim().toUpperCase();
        VoucherValidationRequest req = new VoucherValidationRequest(code, storeId, subtotal);

        try {
            VoucherValidationResponse res = restClient.post()
                    .uri(promotionServiceUrl + "/api/promotions/vouchers/validate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(VoucherValidationResponse.class);

            if (res == null) {
                throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
            }
            if (res.valid() && res.discountAmount() != null && res.discountAmount().signum() >= 0) {
                return new VoucherResult(true, "Đã áp dụng mã giảm giá thành công", res.discountAmount());
            }

            return new VoucherResult(false, res.reason(), BigDecimal.ZERO);
        } catch (ApiException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 404
                    || ex.getStatusCode().value() == 409) {
                return new VoucherResult(false, ErrorCode.VOUCHER_INACTIVE.message(), BigDecimal.ZERO);
            }
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (Exception ex) {
            LOG.warn("Promotion service voucher validation unavailable or rejected code={} storeId={} error={}",
                    code, storeId, ex.getMessage());
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    public LoyaltyResult validateLoyalty(Integer requestedPoints, BigDecimal orderAmount) {
        if (requestedPoints == null || requestedPoints <= 0) {
            return new LoyaltyResult(true, 0, BigDecimal.ZERO, null);
        }
        // ponytail: keep checkout redemption closed until the debit/compensation saga is wired.
        return new LoyaltyResult(false, 0, BigDecimal.ZERO, "Loyalty redemption is not available yet");
    }
}
