package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.config.RbacHelper;
import com.clucky.catalogstoreservice.dto.InventoryDto;
import com.clucky.catalogstoreservice.service.InventoryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}")
public class StoreInventoryController {

    private final InventoryService inventoryService;

    public StoreInventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/inventory")
    public ResponseEntity<List<InventoryDto.InventoryResponse>> getInventory(
            @PathVariable Long storeId,
            HttpServletRequest request) {
        RbacHelper.checkStoreAccess(request, storeId);
        return ResponseEntity.ok(inventoryService.getStoreInventory(storeId));
    }

    @PutMapping("/inventory/{productId}")
    public ResponseEntity<InventoryDto.InventoryResponse> updateProductInventory(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody InventoryDto.InventoryUpdateRequest body,
            HttpServletRequest request) {
        RbacHelper.checkStoreAccess(request, storeId);

        String userIdHeader = request.getHeader("X-User-Id");
        Long updatedBy = null;
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            try { updatedBy = Long.parseLong(userIdHeader.trim()); } catch (NumberFormatException ignored) {}
        }
        String actorName = request.getHeader("X-User-Name");

        return ResponseEntity.ok(inventoryService.updateInventory(storeId, productId, body, updatedBy, actorName));
    }

    @PutMapping("/products/{productId}/availability")
    public ResponseEntity<Void> updateAvailability(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody InventoryDto.AvailabilityUpdateRequest body,
            HttpServletRequest request) {
        RbacHelper.checkStoreAccess(request, storeId);
        inventoryService.updateProductAvailability(storeId, productId, body);
        return ResponseEntity.ok().build();
    }
}
