package com.clucky.identityservice.service;

import com.clucky.identityservice.dto.UserResponse;
import com.clucky.identityservice.repository.UserRepository;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;

public class UserServiceTemplate {
    protected final UserRepository repository;

    public UserServiceTemplate(UserRepository repository) {
        this.repository = repository;
    }

    public UserResponse get(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
