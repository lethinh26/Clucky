package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.ReviewResponse;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;

public class ReviewServiceTemplate {
    protected final ReviewRepository repository;

    public ReviewServiceTemplate(ReviewRepository repository) {
        this.repository = repository;
    }

    public ReviewResponse get(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
