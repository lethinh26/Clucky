package com.clucky.catalogstoreservice.dto;



public record CategoryResponse(
        Long id,
        String name,
        String imageUrl,
        Integer sortOrder,
        Boolean isActive
) {}
