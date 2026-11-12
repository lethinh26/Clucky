package com.clucky.notificationservice.controller;

import com.clucky.notificationservice.config.CurrentActor;
import com.clucky.notificationservice.dto.NotificationReadAllResponse;
import com.clucky.notificationservice.dto.NotificationReadResponse;
import com.clucky.notificationservice.dto.NotificationInboxResponse;
import com.clucky.notificationservice.service.NotificationService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@Validated
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Get paginated notifications for the authenticated user.
     * GET /api/notifications/my?page=0&size=20
     */
    @GetMapping("/my")
    public ResponseEntity<NotificationInboxResponse> myNotifications(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(200) int size,
            @RequestParam(name = "unread", defaultValue = "false") boolean unread,
            @RequestParam(name = "type", required = false) String type
    ) {
        CurrentActor actor = CurrentActor.require();
        PageRequest pageRequest = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );
        NotificationInboxResponse response = notificationService.inbox(actor.userId(), pageRequest, unread, type);
        return ResponseEntity.ok(response);
    }

    /**
     * Mark a single notification as read.
     * PUT /api/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationReadResponse> markRead(
            @PathVariable("id") @Positive Long id
    ) {
        CurrentActor actor = CurrentActor.require();
        NotificationReadResponse response = notificationService.markRead(id, actor.userId());
        return ResponseEntity.ok(response);
    }

    /**
     * Mark all unread notifications of the authenticated user as read.
     * PUT /api/notifications/read-all
     */
    @PutMapping("/read-all")
    public ResponseEntity<NotificationReadAllResponse> markAllRead() {
        CurrentActor actor = CurrentActor.require();
        NotificationReadAllResponse response = notificationService.markAllRead(actor.userId());
        return ResponseEntity.ok(response);
    }
}

