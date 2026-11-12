package com.clucky.identityservice.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record OrderHistoryResponse(JsonNode orders) {}
