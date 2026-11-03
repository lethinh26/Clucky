package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.dto.ProductResponse;
import com.clucky.catalogstoreservice.service.ProductServiceTemplate;
import jakarta.validation.constraints.Positive;

public class ProductControllerTemplate {
    private final ProductServiceTemplate service;

    public ProductControllerTemplate(ProductServiceTemplate service) {
        this.service = service;
    }

    public ProductResponse get(@Positive Long id) {
        return service.get(id);
    }
}
