package com.clucky.cartorderservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CustomerOrderHistoryItem(Long id, String orderCode, String status, BigDecimal totalAmount, Instant createdAt) {}
