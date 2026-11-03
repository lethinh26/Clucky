package com.clucky.paymentservice.dto;



public record BankAccountConfigResponse(
        Long id,
        String bankName,
        String accountNo,
        String accountName,
        Boolean isActive
) {}
