package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.config.RbacHelper;
import com.clucky.catalogstoreservice.dto.StoreDto;
import com.clucky.catalogstoreservice.service.StoreService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping
    public ResponseEntity<List<StoreDto.Response>> listStores(
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(storeService.getAllStores(activeOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StoreDto.Response> getStore(@PathVariable Long id) {
        return ResponseEntity.ok(storeService.getStoreById(id));
    }

    @PostMapping
    public ResponseEntity<StoreDto.Response> createStore(@Valid @RequestBody StoreDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(storeService.createStore(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StoreDto.Response> updateStore(@PathVariable Long id,
                                                         @Valid @RequestBody StoreDto.Request request) {
        return ResponseEntity.ok(storeService.updateStore(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStore(@PathVariable Long id) {
        storeService.deleteStore(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/operation")
    public ResponseEntity<StoreDto.Response> updateOperation(@PathVariable Long id,
                                                             @RequestBody StoreDto.OperationRequest request,
                                                             HttpServletRequest httpRequest) {
        RbacHelper.checkStoreAccess(httpRequest, id);
        return ResponseEntity.ok(storeService.updateOperation(id, request));
    }
}
