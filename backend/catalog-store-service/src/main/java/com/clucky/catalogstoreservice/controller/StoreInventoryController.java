package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.config.AccessGuard;
import com.clucky.catalogstoreservice.config.CurrentActor;
import com.clucky.catalogstoreservice.dto.InventoryDto;
import com.clucky.catalogstoreservice.dto.Role;
import com.clucky.catalogstoreservice.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}")
public class StoreInventoryController {

    private final InventoryService inventoryService;
    private final AccessGuard accessGuard;

    public StoreInventoryController(InventoryService inventoryService, AccessGuard accessGuard) {
        this.inventoryService = inventoryService;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/inventory")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'STAFF')")
    public ResponseEntity<List<InventoryDto.InventoryResponse>> getInventory(
            @PathVariable Long storeId) {
        accessGuard.requireStore(storeId);
        return ResponseEntity.ok(inventoryService.getStoreInventory(storeId));
    }

    @PutMapping("/inventory/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'STAFF')")
    public ResponseEntity<InventoryDto.InventoryResponse> updateProductInventory(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @Valid @RequestBody InventoryDto.InventoryUpdateRequest body) {
        accessGuard.requireStore(storeId);
        var actor = CurrentActor.require();
        if (actor.role() == Role.STAFF && body.getLowStockThreshold() != null) {
            throw new AccessDeniedException("Only a Store Manager or Admin can change the low-stock threshold");
        }
        return ResponseEntity.ok(inventoryService.updateInventory(storeId, productId, body, actor.userId()));
    }

    @PutMapping("/products/{productId}/availability")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'STAFF')")
    public ResponseEntity<Void> updateAvailability(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @Valid @RequestBody InventoryDto.AvailabilityUpdateRequest body) {
        accessGuard.requireStore(storeId);
        if ((body.getStorePrice() != null || Boolean.TRUE.equals(body.getClearStorePrice())) && CurrentActor.require().role() != Role.ADMIN) {
            throw new AccessDeniedException("Only an Admin can change the store price");
        }
        inventoryService.updateProductAvailability(storeId, productId, body);
        return ResponseEntity.ok().build();
    }
}
