package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.service.PaymentOperations;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;

@RestController
@RequestMapping("/api/payments/{orderId}/operations")
@PreAuthorize("hasAnyRole('ADMIN','STAFF','STORE_MANAGER')")
public class PaymentOperationsController {
    private final PaymentOperations service;
    public PaymentOperationsController(PaymentOperations service){this.service=service;}
    @GetMapping
    public JsonNode read(@PathVariable @Positive long orderId){return service.read(orderId);}
    @GetMapping("/cod-evidence")
    public JsonNode codEvidence(@PathVariable @Positive long orderId){return service.codEvidence(orderId);}
    @GetMapping("/cod-evidence/image")
    public ResponseEntity<byte[]> codEvidenceImage(@PathVariable @Positive long orderId){
        var image=service.codEvidenceImage(orderId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.mimeType()))
                .cacheControl(CacheControl.noStore()).body(image.bytes());
    }
    @PostMapping(value="/cod-evidence",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public JsonNode uploadCodEvidence(@PathVariable @Positive long orderId,@RequestParam("file") MultipartFile file){
        return service.uploadCodEvidence(orderId,file);
    }
    @PostMapping("/cod-evidence/approve")
    public JsonNode approveCodEvidence(@PathVariable @Positive long orderId){return service.reviewCodEvidence(orderId,true,null);}
    @PostMapping("/cod-evidence/reject")
    public JsonNode rejectCodEvidence(@PathVariable @Positive long orderId,@RequestBody CodEvidenceReview request){
        return service.reviewCodEvidence(orderId,false,request.reason());
    }
    public record CodEvidenceReview(String reason) {}
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
