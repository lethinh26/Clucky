package com.clucky.shippingservice.controller;

import java.math.BigDecimal;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.clucky.shippingservice.controller.ShippingController.*;

class ShippingControllerTest {
    private final Policy configured = new Policy(new BigDecimal("20000"), 1);

    @Test
    void fixedFeeDoesNotChangeWithDistanceAndBoundaryUsesUnroundedDistance() {
        double boundary = distanceKm(0, 0, 0, 0.01);
        Store store = new Store(1, 0.0, 0.0, BigDecimal.valueOf(boundary));
        Quote exact = quote(configured, store, new QuoteRequest(1L, 0.0, 0.01));
        assertTrue(exact.available());
        assertEquals(configured.fee(), exact.fee());
        assertEquals(configured.fee(), quote(configured, store, new QuoteRequest(1L, 0.0, 0.0)).fee());
        assertEquals("OUT_OF_RANGE", quote(configured, store, new QuoteRequest(1L, 0.0, 0.010000001)).reason());
        assertEquals(0, distanceKm(0, 0, 0, 0));
        assertTrue(distanceKm(0, 179.9, 0, -179.9) < 23);
    }

    @Test
    void missingConfigurationOrCoordinatesNeverInventsAnEligibleDelivery() {
        Store store = new Store(1, 0.0, 0.0, BigDecimal.TEN);
        QuoteRequest pin = new QuoteRequest(1L, 0.0, 0.0);
        Quote noFee = quote(new Policy(null, 0), store, pin);
        assertFalse(noFee.available());
        assertNull(noFee.fee());
        assertEquals("FEE_NOT_CONFIGURED", noFee.reason());
        assertEquals("RADIUS_NOT_CONFIGURED", quote(configured, new Store(1, 0.0, 0.0, null), pin).reason());
        assertEquals("STORE_LOCATION_MISSING", quote(configured, new Store(1, null, null, BigDecimal.TEN), pin).reason());
        assertEquals("LOCATION_REQUIRED", quote(configured, store, new QuoteRequest(1L, null, null)).reason());
    }

    @Test
    void validatesCoordinatesMoneyAndVersionAtTheBoundary() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertFalse(validator.validate(new QuoteRequest(0L, 0.0, 0.0)).isEmpty());
            assertFalse(validator.validate(new QuoteRequest(1L, 91.0, 0.0)).isEmpty());
            assertFalse(validator.validate(new QuoteRequest(1L, null, 0.0)).isEmpty());
            assertFalse(validator.validate(new PolicyRequest(BigDecimal.ZERO, 0L)).isEmpty());
            assertFalse(validator.validate(new PolicyRequest(new BigDecimal("100.5"), 0L)).isEmpty());
            assertFalse(validator.validate(new PolicyRequest(BigDecimal.TEN, -1L)).isEmpty());
            assertTrue(validator.validate(new PolicyRequest(new BigDecimal("20000"), 0L)).isEmpty());
        }
    }
}
