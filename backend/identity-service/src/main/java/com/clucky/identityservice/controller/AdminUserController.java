package com.clucky.identityservice.controller;

import com.clucky.identityservice.dto.AdminUserResponse;
import com.clucky.identityservice.dto.AdminCustomerData.*;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.service.AdminUserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
@Validated
public class AdminUserController {
    private final AdminUserService service;

    public AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminUserResponse> listUsers(
            @RequestParam(value = "role", required = false) Role role,
            @RequestParam(value = "storeId", required = false) @Positive Long storeId,
            @RequestParam(value = "keyword", required = false) @Size(max = 255) String keyword
    ) {
        return service.listUsers(role, storeId, keyword);
    }

    @PutMapping("/{id}/assign-store")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminUserResponse assignStore(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AssignStoreRequest request
    ) {
        return service.assignStore(id, request.storeId());
    }

    @PutMapping("/{id}/lock")
    public AdminUserResponse lock(@PathVariable("id") @Positive Long id,
            @Valid @RequestBody(required = false) StatusChange request) {
        return service.setLocked(id, true, request);
    }

    @PutMapping("/{id}/unlock")
    public AdminUserResponse unlock(@PathVariable("id") @Positive Long id,
            @Valid @RequestBody(required = false) StatusChange request) {
        return service.setLocked(id, false, request);
    }

    @GetMapping("/customers")
    @PreAuthorize("hasRole('ADMIN')")
    public CustomerPage customers(
            @RequestParam(value = "keyword", required = false) @Size(max = 255) String keyword,
            @RequestParam(value = "status", required = false) Status status,
            @RequestParam(value = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.listCustomers(keyword, status, page, size);
    }

    @PutMapping("/customers/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public Customer lockCustomer(@PathVariable("id") @Positive Long id, @Valid @RequestBody StatusChange request) {
        return service.setCustomerLocked(id, true, request);
    }

    @PutMapping("/customers/{id}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    public Customer unlockCustomer(@PathVariable("id") @Positive Long id, @Valid @RequestBody StatusChange request) {
        return service.setCustomerLocked(id, false, request);
    }

    public record AssignStoreRequest(@NotNull @Positive Long storeId) {}
}
