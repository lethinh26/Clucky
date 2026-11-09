package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.config.CorrelationIdFilter;
import com.clucky.catalogstoreservice.dto.ApiError;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/locations")
public class LocationController {
    private final String token;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private long nextRequest;
    public record Place(String label, String detail, String province, String district, String ward,
                        double latitude, double longitude, String featureType, String accuracy) {}

    public LocationController(@Value("${clucky.maps.mapbox-geocoding-token:}") String token, ObjectMapper mapper) {
        this.token = token.trim();
        this.mapper = mapper;
    }

    @GetMapping("/search")
    public ResponseEntity<List<Place>> search(@RequestParam String text, @RequestParam(defaultValue = "vi") String lang,
            @RequestParam(required = false) Double latitude, @RequestParam(required = false) Double longitude) {
        if (text.trim().length() < 3 || text.length() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String proximity = "";
        if (latitude != null || longitude != null) {
            validateCoordinates(latitude, longitude);
            proximity = "&proximity=" + longitude + "," + latitude;
        }
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(query("forward?q="
                + URLEncoder.encode(text.trim(), StandardCharsets.UTF_8)
                + "&country=vn&autocomplete=true&limit=5" + proximity, lang));
    }

    @GetMapping("/reverse")
    public ResponseEntity<List<Place>> reverse(@RequestParam double latitude, @RequestParam double longitude,
            @RequestParam(defaultValue = "vi") String lang) {
        validateCoordinates(latitude, longitude);
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(query("reverse?latitude="
                + latitude + "&longitude=" + longitude + "&types=address,street", lang));
    }

    private static void validateCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null || !Double.isFinite(latitude) || !Double.isFinite(longitude)
                || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }

    private synchronized void reserveRequest() {
        long now = System.nanoTime();
        if (nextRequest != 0 && now < nextRequest) throw new LocationFailure(429, "MAPBOX_RATE_LIMITED");
        nextRequest = now + 500_000_000L;
    }

    private List<Place> query(String query, String language) {
        if (token.isBlank()) throw new LocationFailure(503, "MAPBOX_NOT_CONFIGURED");
        if (!List.of("vi", "en").contains(language)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        reserveRequest();
        try {
            URI uri = URI.create("https://api.mapbox.com/search/geocode/v6/" + query + "&language=" + language
                    + "&permanent=true&access_token=" + URLEncoder.encode(token, StandardCharsets.UTF_8));
            HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(8))
                    .header("Accept", "application/json").GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401 || response.statusCode() == 403) throw new LocationFailure(503, "MAPBOX_ACCESS_DENIED");
            if (response.statusCode() == 429) throw new LocationFailure(429, "MAPBOX_RATE_LIMITED");
            if (response.statusCode() != 200) throw new LocationFailure(502, "MAPBOX_UPSTREAM_ERROR");
            return places(mapper.readTree(response.body()));
        } catch (LocationFailure failure) {
            throw failure;
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new LocationFailure(503, "MAPBOX_UNAVAILABLE");
        } catch (Exception failure) {
            throw new LocationFailure(503, "MAPBOX_UNAVAILABLE");
        }
    }

    static List<Place> places(JsonNode root) {
        if (root == null || !root.path("features").isArray()) throw new LocationFailure(502, "MAPBOX_UPSTREAM_ERROR");
        List<Place> places = new ArrayList<>();
        for (JsonNode feature : root.path("features")) {
            JsonNode point = feature.path("geometry").path("coordinates");
            if (!point.isArray() || point.size() < 2 || !point.get(0).isNumber() || !point.get(1).isNumber()) continue;
            double longitude = point.get(0).asDouble();
            double latitude = point.get(1).asDouble();
            if (!Double.isFinite(latitude) || !Double.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
            JsonNode properties = feature.path("properties");
            JsonNode context = properties.path("context");
            String detail = properties.path("name_preferred").asText(properties.path("name").asText(""));
            String label = properties.path("full_address").asText(detail);
            if (label.isBlank()) continue;
            places.add(new Place(label, detail, context.path("region").path("name").asText(context.path("place").path("name").asText("")),
                    context.path("district").path("name").asText(""),
                    context.path("neighborhood").path("name").asText(context.path("locality").path("name").asText("")),
                    latitude, longitude, properties.path("feature_type").asText(""),
                    properties.path("coordinates").path("accuracy").asText("")));
        }
        return List.copyOf(places);
    }

    private static final class LocationFailure extends RuntimeException {
        private final int status;
        private final String code;
        LocationFailure(int status, String code) { super(code); this.status = status; this.code = code; }
    }

    @ExceptionHandler(LocationFailure.class)
    ResponseEntity<ApiError> locationError(LocationFailure failure, HttpServletRequest request) {
        request.setAttribute(CorrelationIdFilter.ERROR_CODE, failure.code);
        return ResponseEntity.status(failure.status).header("Cache-Control", "no-store").body(new ApiError(
                Instant.now(), failure.status, HttpStatus.valueOf(failure.status).getReasonPhrase(), failure.code,
                "Location lookup is unavailable. Check Mapbox configuration, permissions and billing.", request.getRequestURI()));
    }
}
