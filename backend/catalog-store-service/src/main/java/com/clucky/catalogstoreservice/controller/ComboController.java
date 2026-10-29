package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.dto.ComboDto;
import com.clucky.catalogstoreservice.service.ComboService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(comboService.getAllCombos(activeOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComboDto.Response> getCombo(@PathVariable Long id) {
        return ResponseEntity.ok(comboService.getComboById(id));
    }

    @PostMapping
    public ResponseEntity<ComboDto.Response> createCombo(@Valid @RequestBody ComboDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(comboService.createCombo(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ComboDto.Response> updateCombo(@PathVariable Long id,
                                                         @Valid @RequestBody ComboDto.Request request) {
        return ResponseEntity.ok(comboService.updateCombo(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCombo(@PathVariable Long id) {
        comboService.deleteCombo(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<ComboDto.Response> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(comboService.uploadComboImage(id, file));
    }
}
