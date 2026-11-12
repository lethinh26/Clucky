package com.clucky.shippingservice.controller;

import com.clucky.shippingservice.exception.ApiException;
import com.clucky.shippingservice.exception.ErrorCode;
import com.clucky.shippingservice.service.ShippingPolicyAudit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@RestController
@RequestMapping("/api/shipping")
public class ShippingController {
    public record Policy(BigDecimal fee, long version) {}
    public record PolicyRequest(@NotNull @DecimalMin("1") @Digits(integer = 12, fraction = 0) BigDecimal fee,
            @NotNull @PositiveOrZero Long version) {}
    public record QuoteRequest(@NotNull @Positive Long storeId,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude) {
        @AssertTrue public boolean isCoordinatePairValid() {
            return latitude == null && longitude == null || latitude != null && longitude != null
                    && Double.isFinite(latitude) && Double.isFinite(longitude);
        }
    }
    public record Quote(boolean available, BigDecimal fee, String reason, Double distanceKm, BigDecimal radiusKm, long policyVersion) {}
    public record Store(long id, Double latitude, Double longitude, BigDecimal deliveryRadiusKm) {}
    private final JdbcTemplate jdbc;
    private final DiscoveryClient discovery;
    private final RestClient client;
    private final ShippingPolicyAudit audit;

    public ShippingController(JdbcTemplate jdbc, DiscoveryClient discovery, RestClient.Builder builder, ShippingPolicyAudit audit) {
        this.jdbc = jdbc;
        this.discovery = discovery;
        this.audit = audit;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.client = builder.requestFactory(factory).build();
    }

    private Policy policy() {
        return jdbc.queryForObject("SELECT fee,version FROM shipping_service.shipping_policy WHERE id=1",
                (row, index) -> new Policy(row.getBigDecimal("fee"), row.getLong("version")));
    }

    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public Policy getPolicy() { return policy(); }

    @PutMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public Policy savePolicy(@Valid @RequestBody PolicyRequest request) {
        var result = jdbc.query("UPDATE shipping_service.shipping_policy SET fee=?,version=version+1,updated_at=now() "
                + "WHERE id=1 AND version=? RETURNING fee,version",
                (row, index) -> new Policy(row.getBigDecimal("fee"), row.getLong("version")), request.fee(), request.version());
        if (result.isEmpty()) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        audit.record(result.getFirst().fee(), result.getFirst().version());
        return result.getFirst();
    }

    @PostMapping("/calculate-fee")
    public Quote calculateFee(@Valid @RequestBody QuoteRequest request) {
        Policy policy = policy();
        var instances = discovery.getInstances("catalog-store-service");
        if (instances.isEmpty()) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        Store store;
        try {
            store = client.get().uri(instances.getFirst().getUri() + "/api/stores/" + request.storeId()).retrieve().body(Store.class);
        } catch (RestClientException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (store == null || store.id() != request.storeId()) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        return quote(policy, store, request);
    }

    public static Quote quote(Policy policy, Store store, QuoteRequest request) {
        Double distance = null;
        String reason;
        if (store.latitude() == null || store.longitude() == null || !Double.isFinite(store.latitude())
                || !Double.isFinite(store.longitude()) || Math.abs(store.latitude()) > 90 || Math.abs(store.longitude()) > 180) {
            reason = "STORE_LOCATION_MISSING";
        } else if (request.latitude() == null || request.longitude() == null || !request.isCoordinatePairValid()
                || Math.abs(request.latitude()) > 90 || Math.abs(request.longitude()) > 180) {
            reason = "LOCATION_REQUIRED";
        } else {
            distance = distanceKm(store.latitude(), store.longitude(), request.latitude(), request.longitude());
            reason = store.deliveryRadiusKm() == null || store.deliveryRadiusKm().signum() <= 0 ? "RADIUS_NOT_CONFIGURED"
                    : distance > store.deliveryRadiusKm().doubleValue() ? "OUT_OF_RANGE"
                    : policy == null || policy.fee() == null || policy.fee().signum() <= 0 ? "FEE_NOT_CONFIGURED" : "OK";
        }
        return new Quote("OK".equals(reason), policy == null ? null : policy.fee(), reason, distance,
                store.deliveryRadiusKm(), policy == null ? 0 : policy.version());
    }

    public static double distanceKm(double fromLat, double fromLon, double toLat, double toLon) {
        double latitude = Math.sin(Math.toRadians(toLat - fromLat) / 2);
        double longitude = Math.sin(Math.toRadians(toLon - fromLon) / 2);
        double arc = latitude * latitude + Math.cos(Math.toRadians(fromLat)) * Math.cos(Math.toRadians(toLat)) * longitude * longitude;
        return 6371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, arc))));
    }
}
