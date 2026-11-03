package com.clucky.auditservice.controller;

import com.clucky.auditservice.dto.AuditLogQuery;
import com.clucky.auditservice.dto.AuditLogResponse;
import com.clucky.auditservice.dto.PageResponse;
import com.clucky.auditservice.service.AuditLogService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuditLogController {
    private final AuditLogService service;
    public AuditLogController(AuditLogService service) { this.service = service; }

    @GetMapping("/api/audit-logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public PageResponse<AuditLogResponse> search(@Valid @ModelAttribute AuditLogQuery query) {
        return service.search(query);
    }
}
