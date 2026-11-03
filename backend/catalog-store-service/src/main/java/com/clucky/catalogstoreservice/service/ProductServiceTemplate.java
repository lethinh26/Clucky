package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.ProductResponse;
import com.clucky.catalogstoreservice.repository.ProductRepository;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;

public class ProductServiceTemplate {
    protected final ProductRepository repository;

    public ProductServiceTemplate(ProductRepository repository) {
        this.repository = repository;
    }

    public ProductResponse get(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
