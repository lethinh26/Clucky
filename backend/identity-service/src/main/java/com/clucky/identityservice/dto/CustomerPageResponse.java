package com.clucky.identityservice.dto;

import java.util.List;

public record CustomerPageResponse(List<CustomerAdminResponse> content, int page, int size,
        long totalElements, int totalPages, String sort) {
    public CustomerPageResponse { content = List.copyOf(content); }
}
