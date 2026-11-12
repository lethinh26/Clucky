package com.clucky.identityservice.service;

import com.clucky.identityservice.config.CorrelationIdFilter;
import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.dto.*;
import com.clucky.identityservice.entity.OutboxEvent;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.OutboxEventRepository;
import com.clucky.identityservice.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerAdminService {
    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "updatedAt", "fullName", "status");
    private final UserRepository users;
    private final RefreshTokenService refreshTokens;
    private final OutboxEventRepository outbox;
    private final OrderHistoryClient orderHistoryClient;

    public CustomerAdminService(UserRepository users, RefreshTokenService refreshTokens,
            OutboxEventRepository outbox, ObjectMapper mapper, OrderHistoryClient orderHistoryClient) {
        this.users = users; this.refreshTokens = refreshTokens; this.outbox = outbox; this.mapper = mapper;
        this.orderHistoryClient = orderHistoryClient;
    }

    public com.fasterxml.jackson.databind.JsonNode orderHistory(Long customerId, int page, int size) {
        customer(customerId); // validates target exists and has CUSTOMER role
        if (page < 0 || size < 1 || size > 200) throw new ApiException(ErrorCode.INVALID_REQUEST);
        return orderHistoryClient.getCustomerOrders(customerId, page, size);
    }

    public CustomerPageResponse list(String search, String status, int page, int size, String sort) {
        if (page < 0 || size < 1 || size > 100) throw new ApiException(ErrorCode.INVALID_REQUEST);
        String normalizedSearch = normalizeSearch(search);
        String normalizedStatus = normalizeStatus(status);
        Sort requestedSort = parseSort(sort);
        Page<User> result = users.findCustomers(Role.CUSTOMER, normalizedSearch, normalizedStatus, PageRequest.of(page, size, requestedSort));
        return new CustomerPageResponse(result.getContent().stream().map(CustomerAdminService::toResponse).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), formatSort(requestedSort));
    }

    public CustomerAdminResponse detail(Long customerId) { return toResponse(customer(customerId)); }

    @Transactional
    public CustomerStatusChangeResponse lock(Long customerId, LockCustomerRequest request) {
        User customer = customerForUpdate(customerId);
        if ("LOCKED".equals(customer.getStatus())) return new CustomerStatusChangeResponse(toResponse(customer), false);
        String reason = normalizeReason(request == null ? null : request.reason());
        Instant now = Instant.now();
        customer.setStatus("LOCKED");
        customer.setUpdatedAt(now);
        refreshTokens.revokeAllForUser(customer.getId(), now, true);
        persistEvent("CustomerLocked", customer, reason, now);
        return new CustomerStatusChangeResponse(toResponse(customer), true);
    }

    @Transactional
    public CustomerStatusChangeResponse unlock(Long customerId) {
        User customer = customerForUpdate(customerId);
        if ("ACTIVE".equals(customer.getStatus())) return new CustomerStatusChangeResponse(toResponse(customer), false);
        customer.setStatus("ACTIVE");
        customer.setUpdatedAt(Instant.now());
        persistEvent("CustomerUnlocked", customer, null, customer.getUpdatedAt());
        return new CustomerStatusChangeResponse(toResponse(customer), true);
    }

    private User customer(Long id) { return users.findByIdAndRole(id, Role.CUSTOMER).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND)); }
    private User customerForUpdate(Long id) { return users.findByIdAndRoleForUpdate(id, Role.CUSTOMER).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND)); }
    private static CustomerAdminResponse toResponse(User user) { return new CustomerAdminResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getAvatarUrl(), user.getStatus(), user.getEmailVerified(), user.getCreatedAt(), user.getUpdatedAt()); }
    private static String normalizeSearch(String search) {
        if (search == null) return null; String trimmed = search.trim();
        if (trimmed.isEmpty() || trimmed.length() > 100) throw new ApiException(ErrorCode.INVALID_REQUEST); return trimmed;
    }
    private static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) return null; String value = status.trim().toUpperCase(Locale.ROOT);
        if (!value.equals("ACTIVE") && !value.equals("LOCKED")) throw new ApiException(ErrorCode.INVALID_REQUEST); return value;
    }
    private static String normalizeReason(String reason) {
        if (reason == null) return null; String value = reason.trim();
        if (value.length() > 500) throw new ApiException(ErrorCode.INVALID_REQUEST); return value.isEmpty() ? null : value;
    }
    private static Sort parseSort(String sort) {
        String value = sort == null || sort.isBlank() ? "createdAt,desc" : sort.trim(); String[] pieces = value.split(",", -1);
        if (pieces.length != 2 || !SORT_FIELDS.contains(pieces[0])) throw new ApiException(ErrorCode.INVALID_REQUEST);
        try { return Sort.by(Sort.Direction.fromString(pieces[1]), toProperty(pieces[0])); } catch (IllegalArgumentException e) { throw new ApiException(ErrorCode.INVALID_REQUEST); }
    }
    private static String formatSort(Sort sort) { Sort.Order order = sort.iterator().next(); return fromProperty(order.getProperty()) + "," + order.getDirection().name().toLowerCase(Locale.ROOT); }
    private static String toProperty(String field) { return switch (field) { case "createdAt" -> "createdAt"; case "updatedAt" -> "updatedAt"; case "fullName" -> "fullName"; case "status" -> "status"; default -> throw new ApiException(ErrorCode.INVALID_REQUEST); }; }
    private static String fromProperty(String property) { return property; }
    private void persistEvent(String type, User customer, String reason, Instant occurredAt) {
        CurrentActor actor = CurrentActor.require(); String eventId = UUID.randomUUID().toString();
        String correlationId = MDC.get("correlationId"); if (correlationId == null || !correlationId.matches("[A-Za-z0-9._-]{1,128}")) correlationId = UUID.randomUUID().toString();
        try {
            var payload = mapper.createObjectNode().put("eventId", eventId).put("customerId", customer.getId()).put("adminId", actor.userId()).put("adminRole", actor.role().name()).put("occurredAt", occurredAt.toString());
            if (reason != null) payload.put("reason", reason);
            OutboxEvent event = new OutboxEvent(); event.setEventId(eventId); event.setEventType(type); event.setAggregateId(customer.getId()); event.setCorrelationId(correlationId); event.setPayload(mapper.writeValueAsString(payload)); event.setOccurredAt(occurredAt); event.setAttempts(0); outbox.save(event);
        } catch (JsonProcessingException e) { throw new IllegalStateException("Unable to serialize customer event", e); }
    }
}

