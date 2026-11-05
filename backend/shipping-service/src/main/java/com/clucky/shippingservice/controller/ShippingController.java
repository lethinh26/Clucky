package com.clucky.shippingservice.controller;

import com.clucky.shippingservice.entity.ShippingFeeConfig;
import com.clucky.shippingservice.repository.ShippingFeeConfigRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/shipping")
public class ShippingController {

    private final ShippingFeeConfigRepository feeConfigRepository;

    public ShippingController(ShippingFeeConfigRepository feeConfigRepository) {
        this.feeConfigRepository = feeConfigRepository;
    }

    public record CalculateShippingFeeRequest(
            Long storeId,
            String deliveryAddress,
            BigDecimal subtotal
    ) {}

    public record CalculateShippingFeeResponse(
            BigDecimal fee
    ) {}

    @PostMapping("/calculate-fee")
    public ResponseEntity<CalculateShippingFeeResponse> calculateFee(@RequestBody(required = false) CalculateShippingFeeRequest request) {
        Long storeId = (request != null && request.storeId() != null) ? request.storeId() : 1L;
        BigDecimal subtotal = (request != null && request.subtotal() != null) ? request.subtotal() : BigDecimal.ZERO;

        ShippingFeeConfig config = feeConfigRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    List<ShippingFeeConfig> all = feeConfigRepository.findAll();
                    return all.isEmpty() ? null : all.get(0);
                });

        BigDecimal fee = BigDecimal.valueOf(15000);
        if (config != null) {
            if (config.getFreeFromAmount() != null && subtotal.compareTo(config.getFreeFromAmount()) >= 0) {
                fee = BigDecimal.ZERO;
            } else if (config.getBaseFee() != null) {
                fee = config.getBaseFee();
            }
        }

        return ResponseEntity.ok(new CalculateShippingFeeResponse(fee));
    }
}
