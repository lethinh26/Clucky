package com.clucky.notificationservice.controller;

import com.clucky.notificationservice.dto.PageResponse;
import com.clucky.notificationservice.service.EmailLogService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications/email-logs")
@PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
@Validated
public class EmailLogController {
    private final EmailLogService service;
    public EmailLogController(EmailLogService service) { this.service = service; }

    @ModelAttribute
    public void preventCaching(jakarta.servlet.http.HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }

    @GetMapping
    public PageResponse<EmailLogService.EmailLogView> list(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(name = "recipient", required = false) @Size(max = 255) String recipient,
            @RequestParam(name = "status", required = false) @Size(max = 20) String status,
            @RequestParam(name = "template", required = false) @Size(max = 100) String template,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return service.list(page, size, recipient, status, template, from, to);
    }

    @GetMapping("/{id}")
    public EmailLogService.Detail detail(@PathVariable(name = "id") @Positive long id) { return service.detail(id); }

    public record RetryRequest(@NotNull UUID requestId, @NotNull @Min(0) Integer expectedGeneration) {}

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasRole('ADMIN')")
    public EmailLogService.RetryResult retry(@PathVariable(name = "id") @Positive long id, @Valid @RequestBody RetryRequest request) {
        return service.retry(id, request.expectedGeneration(), request.requestId());
    }
}
