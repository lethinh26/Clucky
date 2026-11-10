package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

@Component
public class PaymentClient {
    private static final Logger LOG = LoggerFactory.getLogger(PaymentClient.class);

    private final RestClient restClient;
    private final String paymentServiceUrl;
    private final CatalogCredential credential;

    public PaymentClient(
            RestClient restClient,
            @Value("${clucky.payment.service-url:http://payment-service}") String paymentServiceUrl,
            CatalogCredential credential
    ) {
        this.restClient = restClient;
        this.paymentServiceUrl = paymentServiceUrl;
        this.credential = credential;
    }

    public record EligibleRefundResponse(
            boolean eligible,
            BigDecimal receivedAmount,
            BigDecimal eligibleAmount,
            BigDecimal heldAmount,
            BigDecimal refundableAmount,
            String reason
    ) {}

    public record ReserveRefundRequest(
            Long refundRequestId,
            Long orderId,
            String orderCode,
            BigDecimal amount
    ) {}

    public record ReserveRefundResponse(
            Long id,
            Long refundRequestId,
            Long orderId,
            BigDecimal amount,
            String status
    ) {}

    public EligibleRefundResponse getEligibleRefund(Long orderId, BigDecimal orderAmount) {
        String token = credential.token();
        try {
            return restClient.get()
                    .uri(paymentServiceUrl + "/api/payments/internal/orders/{orderId}/eligible-refund?orderAmount={amount}",
                            orderId, orderAmount != null ? orderAmount : BigDecimal.ZERO)
                    .headers(h -> h.setBearerAuth(token))
                    .retrieve()
                    .body(EligibleRefundResponse.class);
        } catch (Exception ex) {
            LOG.error("event=payment_client_eligible_refund_failed orderId={} error={}", orderId, ex.getMessage());
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    public ReserveRefundResponse reserveRefund(Long refundRequestId, Long orderId, String orderCode, BigDecimal amount) {
        String token = credential.token();
        try {
            return restClient.post()
                    .uri(paymentServiceUrl + "/api/payments/internal/refund-reservations")
                    .headers(h -> h.setBearerAuth(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new ReserveRefundRequest(refundRequestId, orderId, orderCode, amount))
                    .retrieve()
                    .body(ReserveRefundResponse.class);
        } catch (org.springframework.web.client.HttpClientErrorException.Conflict ex) {
            throw new ApiException(ErrorCode.REFUND_AMOUNT_EXCEEDED);
        } catch (Exception ex) {
            LOG.error("event=payment_client_reserve_failed refundRequestId={} error={}", refundRequestId, ex.getMessage());
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    public void confirmRefund(Long refundRequestId) {
        String token = credential.token();
        try {
            restClient.put()
                    .uri(paymentServiceUrl + "/api/payments/internal/refund-reservations/{id}/confirm", refundRequestId)
                    .headers(h -> h.setBearerAuth(token))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            LOG.error("event=payment_client_confirm_failed refundRequestId={} error={}", refundRequestId, ex.getMessage());
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    public void releaseRefund(Long refundRequestId) {
        String token = credential.token();
        try {
            restClient.put()
                    .uri(paymentServiceUrl + "/api/payments/internal/refund-reservations/{id}/release", refundRequestId)
                    .headers(h -> h.setBearerAuth(token))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            LOG.warn("event=payment_client_release_failed refundRequestId={} error={}", refundRequestId, ex.getMessage());
        }
    }
}

