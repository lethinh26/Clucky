package com.clucky.catalogstoreservice.controller;

import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class LocationControllerTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void mapsLongitudeLatitudeAndOptionalAdministrativeFields() throws Exception {
        var places = LocationController.places(mapper.readTree("""
                {"features":[{"geometry":{"coordinates":[105.834,21.028]},"properties":{
                  "name":"12 Example Street","full_address":"12 Example Street, Hà Nội",
                  "feature_type":"address","coordinates":{"accuracy":"rooftop"},
                  "context":{"region":{"name":"Hà Nội"},"locality":{"name":"Example Ward"}}}}]}
                """));
        assertEquals(1, places.size());
        assertEquals(21.028, places.get(0).latitude());
        assertEquals(105.834, places.get(0).longitude());
        assertEquals("Hà Nội", places.get(0).province());
        assertEquals("", places.get(0).district());
        assertEquals("Example Ward", places.get(0).ward());
        assertEquals("rooftop", places.get(0).accuracy());
    }

    @Test
    void preservesMultipleCandidatesInsteadOfTreatingThemAsFailure() throws Exception {
        var places = LocationController.places(mapper.readTree("""
                {"features":[
                  {"geometry":{"coordinates":[105,21]},"properties":{"name":"First","feature_type":"street"}},
                  {"geometry":{"coordinates":[106,20]},"properties":{"name":"Second","feature_type":"address"}},
                  {"geometry":{"coordinates":[181,21]},"properties":{"name":"Invalid"}},
                  {"geometry":{"coordinates":["105",21]},"properties":{"name":"Invalid type"}}
                ]}
                """));
        assertEquals(2, places.size());
        assertEquals("First", places.get(0).label());
        assertEquals("Second", places.get(1).label());
    }

    @Test
    void emptyResultsDifferFromMalformedProviderResponses() throws Exception {
        assertTrue(LocationController.places(mapper.readTree("{\"features\":[]}")).isEmpty());
        assertThrows(RuntimeException.class, () -> LocationController.places(mapper.readTree("{}")));
    }
}
