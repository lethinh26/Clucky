package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.config.AccessGuard;
import com.clucky.catalogstoreservice.dto.StoreDto;
import com.clucky.catalogstoreservice.service.StoreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;
    private final AccessGuard accessGuard;
    private final com.clucky.catalogstoreservice.service.BranchProvisioning branches;

    public StoreController(StoreService storeService, AccessGuard accessGuard, com.clucky.catalogstoreservice.service.BranchProvisioning branches) {
        this.storeService = storeService;
        this.accessGuard = accessGuard;
        this.branches = branches;
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StoreDto.Response> createStore(@Valid @RequestBody StoreDto.Request request, @RequestHeader("Idempotency-Key") java.util.UUID key) {
        return ResponseEntity.status(HttpStatus.CREATED).body(branches.create(request, key));
    }

    @GetMapping("/{id}/accounts-status")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public java.util.Map<String, Object> accountsStatus(@PathVariable long id) {
        accessGuard.requireStore(id);
        return branches.status(id);
    }

    @PostMapping("/{id}/accounts-retry")
    @PreAuthorize("hasRole('ADMIN')")
    public java.util.Map<String, Object> retry(@PathVariable long id) {
        return branches.retry(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StoreDto.Response> updateStore(@PathVariable Long id,
                                                         @Valid @RequestBody StoreDto.Request request) {
        if ("OPEN".equals(request.getStatus())) branches.synchronize(id);
        return ResponseEntity.ok(storeService.updateStore(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StoreDto.Response> deleteStore(@PathVariable Long id, @RequestParam Long expectedVersion) {
        return ResponseEntity.ok(storeService.deleteStore(id, expectedVersion));
    }

    @PutMapping("/{id}/location")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public StoreDto.Response updateLocation(@PathVariable Long id, @Valid @RequestBody StoreDto.LocationRequest request) {
        accessGuard.requireStore(id);
        return storeService.updateLocation(id, request);
    }

    @PutMapping("/{id}/delivery-settings")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public StoreDto.Response updateDeliverySettings(@PathVariable Long id, @Valid @RequestBody StoreDto.DeliverySettingsRequest request) {
        accessGuard.requireStore(id);
        return storeService.updateDeliverySettings(id, request);
    }

    @PutMapping("/{id}/operation")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<StoreDto.Response> updateOperation(@PathVariable Long id,
                                                             @Valid @RequestBody StoreDto.OperationRequest request) {
        accessGuard.requireStore(id);
        if ("OPEN".equals(request.getStatus())) branches.synchronize(id);
        return ResponseEntity.ok(storeService.updateOperation(id, request));
    }
}
