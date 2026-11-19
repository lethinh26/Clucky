package com.clucky.identityservice.controller;

import com.clucky.identityservice.service.LegalDocumentService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/legal/admin")
@PreAuthorize("hasRole('ADMIN')")
public class LegalAdminController {
    private final LegalDocumentService service;
    public LegalAdminController(LegalDocumentService service) { this.service = service; }

    @GetMapping("/{type}")
    public LegalDocumentService.Overview overview(@PathVariable String type) {
        return service.overview(type);
    }

    @GetMapping("/{type}/history")
    public List<LegalDocumentService.Revision> history(@PathVariable String type) {
        return service.history(type);
    }

    @GetMapping("/{type}/revisions/{version}")
    public LegalDocumentService.Revision preview(@PathVariable String type, @PathVariable int version) {
        return service.preview(type, version);
    }

    @PostMapping("/{type}/draft")
    public LegalDocumentService.Revision saveDraft(@PathVariable String type,
            @Valid @RequestBody LegalDocumentService.DraftInput request) {
        return service.saveDraft(type, request);
    }

    @PostMapping("/{type}/publish")
    public LegalDocumentService.Revision publish(@PathVariable String type,
            @Valid @RequestBody LegalDocumentService.PublishedRequest request) {
        return service.publish(type, request.version());
    }

    @PostMapping("/{type}/restore/{version}")
    public LegalDocumentService.Revision restore(@PathVariable String type, @PathVariable int version,
            @Valid @RequestBody LegalDocumentService.RestoreRequest request) {
        return service.restore(type, version, request);
    }
}
