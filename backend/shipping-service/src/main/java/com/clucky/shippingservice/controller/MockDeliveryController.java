package com.clucky.shippingservice.controller;

import com.clucky.shippingservice.service.MockDeliveryEngine;
import com.clucky.shippingservice.service.MockDeliveryEngine.FailRequest;
import com.clucky.shippingservice.service.MockDeliveryEngine.NoteRequest;
import com.clucky.shippingservice.service.MockDeliveryEngine.TrackingResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shipping/shipments/{orderId}")
public class MockDeliveryController {
    private final MockDeliveryEngine engine;

    public MockDeliveryController(MockDeliveryEngine engine) { this.engine = engine; }

    @GetMapping("/tracking")
    @PreAuthorize("hasAnyRole('CUSTOMER','STAFF','STORE_MANAGER','ADMIN')")
    public TrackingResponse tracking(@PathVariable @Positive long orderId) {
        return engine.tracking(orderId);
    }

    @PostMapping("/simulation/fail")
    @PreAuthorize("hasAnyRole('STAFF','STORE_MANAGER','ADMIN')")
    public TrackingResponse fail(@PathVariable @Positive long orderId, @RequestBody FailRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String key) {
        return engine.fail(orderId, new FailRequest(request.reasonCode(), request.note(),
                request.attemptNumber(), request.version(), request.idempotencyKey() == null
                ? key : request.idempotencyKey()));
    }

    @PostMapping("/simulation/return")
    @PreAuthorize("hasAnyRole('STAFF','STORE_MANAGER','ADMIN')")
    public TrackingResponse returned(@PathVariable @Positive long orderId,
            @RequestBody(required = false) NoteRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String key) {
        return engine.returned(orderId, withKey(request, key));
    }

    @PostMapping("/simulation/retry")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public TrackingResponse retry(@PathVariable @Positive long orderId,
            @RequestBody(required = false) NoteRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String key) {
        return engine.retry(orderId, withKey(request, key));
    }

    @PostMapping("/simulation/close")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public TrackingResponse close(@PathVariable @Positive long orderId, @RequestBody NoteRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String key) {
        return engine.close(orderId, withKey(request, key));
    }

    private static NoteRequest withKey(NoteRequest request, String key) {
        if (request == null) return key == null ? null : new NoteRequest(null, null, null, key);
        return new NoteRequest(request.note(), request.attemptNumber(), request.version(),
                request.idempotencyKey() == null ? key : request.idempotencyKey());
    }
}
