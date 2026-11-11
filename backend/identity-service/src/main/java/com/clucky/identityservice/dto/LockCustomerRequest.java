package com.clucky.identityservice.dto;

import jakarta.validation.constraints.Size;

public record LockCustomerRequest(@Size(max = 500) String reason) {}
