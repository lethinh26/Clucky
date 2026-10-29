package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.dto.ValidationDto;
import com.clucky.catalogstoreservice.service.ValidationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog/internal")
public class InternalCatalogController {

    private final ValidationService validationService;

    public InternalCatalogController(ValidationService validationService) {
        this.validationService = validationService;
    }

    @PostMapping("/validate-items")
    public ResponseEntity<ValidationDto.Response> validateItems(@RequestBody ValidationDto.Request request) {
        return ResponseEntity.ok(validationService.validateOrderItems(request));
    }
}
