package com.clucky.reviewreportservice.mapper;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;

@Component
public class EventMapper {
    private final ObjectMapper mapper;
    private final ObjectReader reader;
    private final Validator validator;

    public EventMapper(ObjectMapper mapper, Validator validator) {
        this.mapper = mapper;
        this.reader = mapper.readerFor(DomainEvent.class).with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        this.validator = validator;
    }

    public DomainEvent fromJson(String json, String expectedEventType) {
        if (json == null || json.isBlank() || expectedEventType == null || expectedEventType.isBlank()) {
            throw new IllegalArgumentException("Event body and expected type are required");
        }
        try {
            DomainEvent event = reader.readValue(json);
            validate(event);
            if (!expectedEventType.equals(event.eventType())) {
                throw new IllegalArgumentException("Event type does not match topic contract");
            }
            return event;
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("Invalid event JSON");
        }
    }

    public String toJson(DomainEvent event) {
        validate(event);
        try {
            return mapper.writeValueAsString(event);
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("Event cannot be serialized");
        }
    }

    private void validate(DomainEvent event) {
        if (event == null || !validator.validate(event).isEmpty() || !event.payload().isObject()) {
            throw new IllegalArgumentException("Invalid event envelope");
        }
    }
}
