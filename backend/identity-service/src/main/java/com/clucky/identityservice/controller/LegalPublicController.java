package com.clucky.identityservice.controller;

import com.clucky.identityservice.service.LegalDocumentService;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/legal/public")
public class LegalPublicController {
    private final LegalDocumentService service;

    public LegalPublicController(LegalDocumentService service) { this.service = service; }

    /** No admin identity or unpublished fields leave the public API. */
    public record PublicDocument(String type, int version, String titleVi, String titleEn,
                                 String htmlVi, String htmlEn, Instant publishedAt) {}

    @GetMapping("/status")
    public LegalDocumentService.PublicStatus status() {
        return service.publicStatus();
    }

    @GetMapping("/{type}")
    public PublicDocument published(@PathVariable String type) {
        LegalDocumentService.Revision r = service.published(type);
        return new PublicDocument(r.type(), r.version(), r.titleVi(), r.titleEn(),
                r.htmlVi(), r.htmlEn(), r.publishedAt());
    }
}
