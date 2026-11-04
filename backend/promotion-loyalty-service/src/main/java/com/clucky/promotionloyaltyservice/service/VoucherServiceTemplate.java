package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.VoucherResponse;
import com.clucky.promotionloyaltyservice.repository.VoucherRepository;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;

public class VoucherServiceTemplate {
    protected final VoucherRepository repository;

    public VoucherServiceTemplate(VoucherRepository repository) {
        this.repository = repository;
    }

    public VoucherResponse get(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
