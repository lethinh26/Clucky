package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class StoreStatusConverter implements AttributeConverter<StoreStatus, String> {

    @Override
    public String convertToDatabaseColumn(StoreStatus attribute) {
        return attribute != null ? attribute.name() : StoreStatus.OPEN.name();
    }

    @Override
    public StoreStatus convertToEntityAttribute(String dbData) {
        return StoreStatus.fromString(dbData);
    }
}
