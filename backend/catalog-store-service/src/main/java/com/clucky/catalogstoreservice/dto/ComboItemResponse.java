package com.clucky.catalogstoreservice.dto;



public record ComboItemResponse(
        Long id,
        Long comboId,
        Long productId,
        Integer quantity,
        Long optionId
) {}
