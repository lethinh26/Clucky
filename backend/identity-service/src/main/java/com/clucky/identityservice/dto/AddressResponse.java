package com.clucky.identityservice.dto;



public record AddressResponse(
        Long id,
        Long userId,
        String receiverName,
        String phone,
        String province,
        String district,
        String ward,
        String detail,
        Boolean isDefault
) {}
