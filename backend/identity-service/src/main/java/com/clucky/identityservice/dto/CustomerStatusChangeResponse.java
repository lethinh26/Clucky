package com.clucky.identityservice.dto;

public record CustomerStatusChangeResponse(CustomerAdminResponse customer, boolean changed) {}
