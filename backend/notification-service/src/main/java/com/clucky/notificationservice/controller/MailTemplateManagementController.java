package com.clucky.notificationservice.controller;

import com.clucky.notificationservice.config.CurrentActor;
import com.clucky.notificationservice.service.MailTemplateManagementService;
import com.clucky.notificationservice.service.MailTemplateManagementService.Detail;
import com.clucky.notificationservice.service.MailTemplateManagementService.Preview;
import com.clucky.notificationservice.service.MailTemplateManagementService.Summary;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/notifications/email-templates")
public class MailTemplateManagementController {
    private final MailTemplateManagementService service;

    public MailTemplateManagementController(MailTemplateManagementService service) { this.service = service; }

    @ModelAttribute
    public void noCache(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }

    @GetMapping
    public List<Summary> list() { return service.list(); }

    @GetMapping("/{key}")
    public Detail get(@PathVariable @NotBlank @Size(max=100) String key) { return service.get(key); }

    public record DraftRequest(@NotNull @Min(0) Integer expectedRevision,
            @NotBlank @Size(max=255) String subject,
            @NotBlank @Size(max=100000) String text,
            @Size(max=100000) String html) {}

    public record PublishRequest(@NotNull @Positive Long revisionId,
            @NotNull @Min(0) Long expectedPublishedRevisionId) {}
    public record RestoreRequest(@NotNull @Positive Long revisionId,
            @NotNull @Min(0) Integer expectedRevision) {}

    @PostMapping("/{key}/drafts")
    public Detail saveDraft(@PathVariable String key, @Valid @RequestBody DraftRequest input) {
        return service.saveDraft(key, input.expectedRevision(), input.subject(), input.text(), input.html(),
                CurrentActor.require().userId());
    }

    @PostMapping("/{key}/publish")
    public Detail publish(@PathVariable String key, @Valid @RequestBody PublishRequest input) {
        return service.publish(key, input.revisionId(), input.expectedPublishedRevisionId(), CurrentActor.require().userId());
    }

    @PostMapping("/{key}/restore")
    public Detail restore(@PathVariable String key, @Valid @RequestBody RestoreRequest input) {
        return service.restore(key, input.revisionId(), input.expectedRevision(), CurrentActor.require().userId());
    }

    @PostMapping("/{key}/preview")
    public Preview preview(@PathVariable String key, @Valid @RequestBody DraftRequest input) {
        return service.preview(key, input.subject(), input.text(), input.html());
    }
}
