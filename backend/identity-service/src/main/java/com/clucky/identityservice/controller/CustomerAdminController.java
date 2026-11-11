package com.clucky.identityservice.controller;

import com.clucky.identityservice.dto.*;
import com.clucky.identityservice.service.CustomerAdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@org.springframework.validation.annotation.Validated
@RequestMapping("/api/users/customers")
@PreAuthorize("hasRole('ADMIN')")
public class CustomerAdminController {
    private final CustomerAdminService service;
    public CustomerAdminController(CustomerAdminService service) { this.service = service; }
    @GetMapping public CustomerPageResponse list(@RequestParam(required = false) String search, @RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "createdAt,desc") String sort) { return service.list(search, status, page, size, sort); }
    @GetMapping("/{id}") public CustomerAdminResponse detail(@PathVariable @Positive Long id) { return service.detail(id); }
    @PostMapping("/{id}/lock") public CustomerStatusChangeResponse lock(@PathVariable @Positive Long id, @Valid @RequestBody(required = false) LockCustomerRequest request) { return service.lock(id, request); }
    @PostMapping("/{id}/unlock") public CustomerStatusChangeResponse unlock(@PathVariable @Positive Long id) { return service.unlock(id); }
}
