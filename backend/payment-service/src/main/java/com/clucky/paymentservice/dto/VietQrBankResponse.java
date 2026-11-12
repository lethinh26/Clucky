package com.clucky.paymentservice.dto;

public record VietQrBankResponse(
        String bin,
        String shortName,
        String name,
        String logo
) {}
