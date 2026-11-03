package com.clucky.reviewreportservice.controller;

import com.clucky.reviewreportservice.dto.ReviewResponse;
import com.clucky.reviewreportservice.service.ReviewServiceTemplate;
import jakarta.validation.constraints.Positive;

public class ReviewControllerTemplate {
    private final ReviewServiceTemplate service;

    public ReviewControllerTemplate(ReviewServiceTemplate service) {
        this.service = service;
    }

    public ReviewResponse get(@Positive Long id) {
        return service.get(id);
    }
}
