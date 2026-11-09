package com.clucky.cartorderservice.controller;

import com.clucky.cartorderservice.dto.CreatePartyOrderRequest;
import com.clucky.cartorderservice.dto.PageResponse;
import com.clucky.cartorderservice.dto.PartyOrderResponse;
import com.clucky.cartorderservice.dto.UpdatePartyOrderStatusRequest;
import com.clucky.cartorderservice.service.PartyOrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/party-orders")
@org.springframework.security.access.prepost.PreAuthorize("denyAll()")
public class PartyOrderController {
    private final PartyOrderService partyOrderService;

    public PartyOrderController(PartyOrderService partyOrderService) {
        this.partyOrderService = partyOrderService;
    }

    @PostMapping
    public ResponseEntity<PartyOrderResponse> createPartyOrder(@Valid @RequestBody CreatePartyOrderRequest request) {
        PartyOrderResponse response = partyOrderService.createPartyOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    public ResponseEntity<PageResponse<PartyOrderResponse>> getMyPartyOrders(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int pageNum = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 200);
        Pageable pageable = PageRequest.of(pageNum, pageSize);

        PageResponse<PartyOrderResponse> response = partyOrderService.getMyPartyOrders(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<PartyOrderResponse>> getPartyOrders(
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int pageNum = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 200);
        Pageable pageable = PageRequest.of(pageNum, pageSize);

        PageResponse<PartyOrderResponse> response = partyOrderService.getStorePartyOrders(storeId, status, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PartyOrderResponse> getPartyOrderById(@PathVariable("id") @Positive Long id) {
        PartyOrderResponse response = partyOrderService.getPartyOrderById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<PartyOrderResponse> updateStatus(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody UpdatePartyOrderStatusRequest request
    ) {
        PartyOrderResponse response = partyOrderService.updateStatus(id, request);
        return ResponseEntity.ok(response);
    }
}
