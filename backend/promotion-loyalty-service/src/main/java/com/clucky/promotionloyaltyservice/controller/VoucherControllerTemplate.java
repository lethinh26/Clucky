package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.dto.VoucherResponse;
import com.clucky.promotionloyaltyservice.service.VoucherServiceTemplate;
import jakarta.validation.constraints.Positive;

public class VoucherControllerTemplate {
    private final VoucherServiceTemplate service;

    public VoucherControllerTemplate(VoucherServiceTemplate service) {
        this.service = service;
    }

    public VoucherResponse get(@Positive Long id) {
        return service.get(id);
    }
}
