package com.clucky.shippingservice.service;

import com.clucky.shippingservice.exception.ApiException;
import com.clucky.shippingservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Saves the actual drivable Mapbox geometry; a straight line is never substituted. */
@Component
public class MockRouteProvider {
    public record Route(JsonNode geometry, double distanceMeters) {}
    public record Store(long id, Double latitude, Double longitude) {}

    private final DiscoveryClient discovery;
    private final RestClient rest;
    private final String mapboxToken;

    public MockRouteProvider(DiscoveryClient discovery, RestClient.Builder builder,
            @Value("${clucky.shipping.mock.mapbox-token:}") String mapboxToken) {
        this.discovery = discovery;
        this.mapboxToken = mapboxToken;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(6));
        this.rest = builder.requestFactory(factory).build();
    }

    public Route fetch(long storeId, double toLat, double toLon) {
        if (mapboxToken == null || mapboxToken.isBlank()) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        if (!valid(toLat, toLon)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var stores = discovery.getInstances("catalog-store-service");
        if (stores.isEmpty()) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        try {
            Store store = rest.get().uri(stores.getFirst().getUri() + "/api/stores/" + storeId)
                    .retrieve().body(Store.class);
            if (store == null || store.id() != storeId || store.latitude() == null
                    || store.longitude() == null || !valid(store.latitude(), store.longitude())) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }
            String path = store.longitude() + "," + store.latitude() + ";" + toLon + "," + toLat;
            String url = "https://api.mapbox.com/directions/v5/mapbox/driving/" + path
                    + "?alternatives=false&steps=false&overview=full&geometries=geojson&access_token="
                    + URLEncoder.encode(mapboxToken, StandardCharsets.UTF_8);
            JsonNode directions = rest.get().uri(java.net.URI.create(url)).retrieve().body(JsonNode.class);
            if (directions == null || !"Ok".equals(directions.path("code").asText())
                    || !directions.path("routes").isArray() || directions.path("routes").isEmpty()) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }
            JsonNode first = directions.path("routes").get(0);
            JsonNode geometry = first.path("geometry");
            if (!"LineString".equals(geometry.path("type").asText())
                    || !geometry.path("coordinates").isArray()
                    || geometry.path("coordinates").size() < 2
                    || geometry.path("coordinates").size() > 15000
                    || !first.path("distance").isNumber()
                    || !Double.isFinite(first.path("distance").asDouble())) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }
            for (JsonNode point : geometry.path("coordinates")) {
                if (!point.isArray() || point.size() < 2 || !point.get(0).isNumber()
                        || !point.get(1).isNumber() || !valid(point.get(1).asDouble(), point.get(0).asDouble())) {
                    throw new ApiException(ErrorCode.UPSTREAM_ERROR);
                }
            }
            return new Route(geometry.deepCopy(), first.path("distance").asDouble());
        } catch (RestClientException | IllegalArgumentException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }

    private static boolean valid(double latitude, double longitude) {
        return Double.isFinite(latitude) && Double.isFinite(longitude)
                && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    }
}
