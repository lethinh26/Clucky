package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.service.PaymentOperations;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/{orderId}/operations")
@PreAuthorize("hasAnyRole('ADMIN','STAFF','STORE_MANAGER')")
public class PaymentOperationsController {
    private final PaymentOperations service;
    public PaymentOperationsController(PaymentOperations service){this.service=service;}
    @GetMapping
    public JsonNode read(@PathVariable @Positive long orderId){return service.read(orderId);}
    @PostMapping("/collection")
    public JsonNode collect(@PathVariable @Positive long orderId,@RequestHeader("Idempotency-Key") UUID key,@Valid @RequestBody PaymentOperations.CollectionRequest request){return service.collect(orderId,request,key);}
    @PostMapping("/reconcile")
    public JsonNode reconcile(@PathVariable @Positive long orderId,@RequestHeader("Idempotency-Key") UUID key,@Valid @RequestBody PaymentOperations.ReconcileRequest request){return service.reconcile(orderId,request,key);}
    @PostMapping("/assign")
    public JsonNode assign(@PathVariable @Positive long orderId,@RequestHeader("Idempotency-Key") UUID key,@Valid @RequestBody PaymentOperations.ReconcileRequest request){return service.assign(orderId,request,key);}
    @PostMapping("/legacy")
    @PreAuthorize("hasRole('ADMIN')")
    public JsonNode legacy(@PathVariable @Positive long orderId,@RequestHeader("Idempotency-Key") UUID key,@Valid @RequestBody PaymentOperations.LegacyRequest request){return service.adopt(orderId,request,key);}
}
