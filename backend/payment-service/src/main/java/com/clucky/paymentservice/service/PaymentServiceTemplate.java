package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.PaymentResponse;
import com.clucky.paymentservice.repository.PaymentRepository;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;

public class PaymentServiceTemplate {
    protected final PaymentRepository repository;

    public PaymentServiceTemplate(PaymentRepository repository) {
        this.repository = repository;
    }

    public PaymentResponse get(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
