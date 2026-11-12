package com.clucky.notificationservice.controller;

import com.clucky.notificationservice.dto.PageResponse;
import com.clucky.notificationservice.service.AdminNotificationService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminNotificationController {
    private final AdminNotificationService service;

    public AdminNotificationController(AdminNotificationService service) {
        this.service = service;
    }

    @ModelAttribute
    public void preventCaching(jakarta.servlet.http.HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
    }

    @GetMapping("/email-logs")
    public PageResponse<AdminNotificationService.EmailLogView> emailLogs(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(name = "recipient", required = false) @Size(max = 255) String recipient,
            @RequestParam(name = "status", required = false) @Size(max = 20) String status,
            @RequestParam(name = "template", required = false) @Size(max = 100) String template,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return service.emailLogs(page, size, recipient, status, template, from, to);
    }

    @PostMapping("/email-logs/{id}/retry")
    public AdminNotificationService.EmailLogView retryEmail(@PathVariable(name = "id") @Positive long id) {
        return service.retryEmail(id);
    }

    @GetMapping("/admin")
    public PageResponse<AdminNotificationService.NotificationView> inbox(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.inbox(page, size);
    }

    @GetMapping("/admin/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("unreadCount", service.unreadCount());
    }

    @PutMapping("/admin/{id}/read")
    public Map<String, Object> markRead(@PathVariable(name = "id") @Positive long id) {
        service.markRead(id);
        return Map.of("id", id, "isRead", true);
    }

    @PutMapping("/admin/read-all")
    public Map<String, Integer> markAllRead() {
        return Map.of("updatedCount", service.markAllRead());
    }
}
