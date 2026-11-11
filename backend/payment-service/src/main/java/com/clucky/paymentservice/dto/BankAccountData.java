package com.clucky.paymentservice.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public final class BankAccountData {
    private BankAccountData() {}

    public record Details(
            @NotBlank @Size(max = 100) String bankName,
            @NotBlank @Pattern(regexp = "[A-Za-z0-9]{2,20}") String bankCode,
            @NotBlank @Pattern(regexp = "[0-9]{1,80}") String accountNo,
            @NotBlank @Size(max = 160) String accountName,
            @NotNull Boolean active,
            @NotNull @PositiveOrZero Long version) {}

    public record AssignmentRequest(@Positive Long bankAccountId, @NotNull @PositiveOrZero Long version) {}

    public record Account(long id, String bankName, String bankCode, String accountNo,
            String accountName, boolean active, long version) {}

    public record Bank(String name, String shortName, String code, String bin) {}

    public record Assignment(long storeId, Long bankAccountId, long version) {}

    public record Overview(List<Account> accounts, List<Assignment> assignments,
            boolean sepayKeyConfigured, boolean reconciliationAvailable) {}
}
