package com.clucky.cartorderservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

@Component
public class ShippingClient {
    private static final Logger LOG = LoggerFactory.getLogger(ShippingClient.class);

    private final RestClient restClient;
    private final String shippingServiceUrl;

    public ShippingClient(
            RestClient restClient,
            @Value("${clucky.shipping.service-url:http://shipping-service}") String shippingServiceUrl
    ) {
        this.restClient = restClient;
        this.shippingServiceUrl = shippingServiceUrl;
    }

    public record CalculateShippingFeeRequest(
            Long storeId,
            String deliveryAddress,
            BigDecimal subtotal
    ) {}

    public record CalculateShippingFeeResponse(
            BigDecimal fee
    ) {}

    public record ShippingFeeResult(
            boolean available,
            BigDecimal fee,
            String message
    ) {}

    public ShippingFeeResult calculateShippingFee(String type, Long storeId, String deliveryAddress, BigDecimal subtotal) {
        if ("PICKUP".equalsIgnoreCase(type)) {
            return new ShippingFeeResult(true, BigDecimal.ZERO, null);
        }

        CalculateShippingFeeRequest req = new CalculateShippingFeeRequest(storeId, deliveryAddress, subtotal);
        try {
            CalculateShippingFeeResponse res = restClient.post()
                    .uri(shippingServiceUrl + "/api/shipping/calculate-fee")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(CalculateShippingFeeResponse.class);

            if (res != null && res.fee() != null) {
                return new ShippingFeeResult(true, res.fee(), null);
            }
            LOG.warn("Shipping service returned null fee for storeId={} address={}", storeId, deliveryAddress);
            return new ShippingFeeResult(false, null, "Không nhận được phản hồi hợp lệ về phí vận chuyển");
        } catch (Exception ex) {
            LOG.warn("Shipping service calculate-fee unavailable: storeId={} address={} error={}",
                    storeId, deliveryAddress, ex.getMessage());
            return new ShippingFeeResult(false, null, "Dịch vụ vận chuyển tạm thời chưa sẵn sàng hoặc không khả dụng");
        }
    }
}
