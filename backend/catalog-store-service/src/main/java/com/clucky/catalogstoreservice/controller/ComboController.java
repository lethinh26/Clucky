package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.dto.ComboDto;
import com.clucky.catalogstoreservice.service.ComboService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/catalog/combos")
public class ComboController {

    private final ComboService comboService;

    public ComboController(ComboService comboService) {
        this.comboService = comboService;
    }

    @GetMapping
    public ResponseEntity<List<ComboDto.Response>> listCombos(
            @RequestParam(name = "storeId", required = false) Long storeId,
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(comboService.getAllCombos(storeId, activeOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComboDto.Response> getCombo(
            @PathVariable Long id,
            @RequestParam(name = "storeId", required = false) Long storeId) {
        return ResponseEntity.ok(comboService.getComboById(id, storeId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComboDto.Response> createCombo(@Valid @RequestBody ComboDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(comboService.createCombo(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComboDto.Response> updateCombo(@PathVariable Long id,
                                                         @Valid @RequestBody ComboDto.Request request) {
        return ResponseEntity.ok(comboService.updateCombo(id, request));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComboDto.Response> updateStatus(
            @PathVariable Long id,
            @RequestParam Long expectedVersion,
            @RequestParam(name = "active", required = false) Boolean activeParam,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        boolean active;
        if (activeParam != null) {
            active = activeParam;
        } else if (body != null && body.get("isActive") instanceof Boolean value) {
            active = value;
        } else {
            throw new com.clucky.catalogstoreservice.exception.ApiException(com.clucky.catalogstoreservice.exception.ErrorCode.VALIDATION_ERROR);
        }
        return ResponseEntity.ok(comboService.updateComboStatus(id, active, expectedVersion));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCombo(@PathVariable Long id, @RequestParam Long expectedVersion) {
        comboService.deleteCombo(id, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComboDto.Response> uploadImage(
            @PathVariable Long id,
            @RequestParam Long expectedVersion,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(comboService.uploadComboImage(id, file, expectedVersion));
    }
}
