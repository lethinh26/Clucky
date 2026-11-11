package com.clucky.identityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class AdminCustomerData {
    private AdminCustomerData() {}

    public enum Status { ACTIVE, LOCKED }

    public record Customer(Long id, String fullName, String maskedEmail, String maskedPhone,
            String status, Instant createdAt) {}

    public record CustomerPage(List<Customer> content, int page, int size, long totalElements, int totalPages) {}

    public record StatusChange(@NotBlank @Size(min = 3, max = 500) String reason,
            @NotNull Status expectedStatus) {}
}
