package com.clucky.identityservice.controller;

import com.clucky.identityservice.dto.UserResponse;
import com.clucky.identityservice.service.UserServiceTemplate;
import jakarta.validation.constraints.Positive;

public class UserControllerTemplate {
    private final UserServiceTemplate service;

    public UserControllerTemplate(UserServiceTemplate service) {
        this.service = service;
    }

    public UserResponse get(@Positive Long id) {
        return service.get(id);
    }
}
