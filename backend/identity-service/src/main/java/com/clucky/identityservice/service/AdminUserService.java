package com.clucky.identityservice.service;

import com.clucky.identityservice.dto.AdminUserResponse;
import com.clucky.identityservice.dto.AdminCustomerData.*;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {
    private final UserRepository users;
    private final RefreshTokenService sessions;
    private final JdbcTemplate jdbc;
    private final IdentityAuditService audit;

    public AdminUserService(UserRepository users, RefreshTokenService sessions, JdbcTemplate jdbc, IdentityAuditService audit) {
        this.users = users;
        this.sessions = sessions;
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(Role role, Long storeId, String keyword) {
        CurrentActor actor = CurrentActor.require();
        boolean admin = actor.role() == Role.ADMIN;
        if (!admin && actor.role() != Role.STORE_MANAGER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        if (!admin && (actor.storeId() == null || actor.storeId() <= 0)) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        String normalizedKeyword = keyword == null || keyword.isBlank()
                ? null
                : "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
        Specification<User> specification = (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (role != null) {
                predicates.add(builder.equal(root.get("role"), role));
            }
            if (storeId != null) {
                predicates.add(builder.equal(root.get("storeId"), admin ? storeId : actor.storeId()));
            } else if (!admin) {
                predicates.add(builder.equal(root.get("storeId"), actor.storeId()));
            }
            if (!admin) {
                predicates.add(builder.equal(root.get("role"), Role.STAFF));
                if (role != null && role != Role.STAFF) {
                    predicates.add(builder.disjunction());
                }
            }
            if (normalizedKeyword != null) {
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("fullName")), normalizedKeyword),
                        builder.like(builder.lower(root.get("email")), normalizedKeyword)
                ));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
        return users.findAll(specification, Sort.by(Sort.Direction.ASC, "id"))
                .stream()
                .map(AdminUserService::toResponse)
                .toList();
    }

    @Transactional
    public AdminUserResponse assignStore(Long userId, Long storeId) {
        if (CurrentActor.require().role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        if (userId == null || userId <= 0 || storeId == null || storeId <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        throw new ApiException(ErrorCode.METHOD_NOT_ALLOWED);
    }

    @Transactional
    public AdminUserResponse setLocked(Long userId, boolean locked, StatusChange request) {
        return toResponse(changeStatus(userId, locked, request, false));
    }

    @Transactional
    public Customer setCustomerLocked(Long userId, boolean locked, StatusChange request) {
        requireAdmin();
        return toCustomer(changeStatus(userId, locked, request, true));
    }

    private User changeStatus(Long userId, boolean locked, StatusChange request, boolean customerOnly) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.role() != Role.STORE_MANAGER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        jdbc.execute("SELECT pg_advisory_xact_lock(192615)");
        User user = users.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (customerOnly && user.getRole() != Role.CUSTOMER) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        if (actor.role() == Role.ADMIN) {
            if (locked && Objects.equals(actor.userId(), userId)) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
        } else if (actor.role() != Role.STORE_MANAGER
                || actor.storeId() == null || actor.storeId() <= 0
                || user.getRole() != Role.STAFF
                || !Objects.equals(user.getStoreId(), actor.storeId())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        boolean branchAccount = user.getRole() == Role.STAFF || user.getRole() == Role.STORE_MANAGER;
        if (!locked && branchAccount && !user.isCurrentBranchAccount()
                && (user.getLoginName() != null || (user.getStoreId() != null && Boolean.TRUE.equals(jdbc.queryForObject(
                        "SELECT EXISTS (SELECT 1 FROM identity_service.branch_accounts WHERE store_id=?)",
                        Boolean.class, user.getStoreId()))))) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        if (user.getRole() == Role.CUSTOMER) {
            if (request == null || request.reason() == null || request.reason().trim().length() < 3
                    || request.reason().length() > 500 || request.expectedStatus() == null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
            if (!request.expectedStatus().name().equals(user.getStatus())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
        }
        String beforeStatus = user.getStatus();
        String afterStatus = locked ? AuthService.STATUS_LOCKED : AuthService.STATUS_ACTIVE;
        if (!AuthService.STATUS_ACTIVE.equals(beforeStatus) && !AuthService.STATUS_LOCKED.equals(beforeStatus)) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (beforeStatus.equals(afterStatus)) return user;
        user.setStatus(afterStatus);
        users.save(user);
        sessions.revokeAllForUser(userId);
        boolean customer = user.getRole() == Role.CUSTOMER;
        audit.record(actor.userId(), actor.role().name(), user.getStoreId(), BranchAccountService.sessionId(),
                (customer ? "CUSTOMER_" : "ACCOUNT_") + (locked ? "LOCKED" : "UNLOCKED"), userId,
                customer ? "Customer" : "Account", Map.of("beforeStatus", beforeStatus, "afterStatus", afterStatus,
                        "reason", request == null ? "" : request.reason().trim(), "result", "SUCCESS"), null);
        return user;
    }

    @Transactional(readOnly = true)
    public CustomerPage listCustomers(String keyword, Status status, int page, int size) {
        requireAdmin();
        if (page < 0 || size < 1 || size > 100 || (keyword != null && keyword.length() > 255)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        String term = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        String pattern = "%" + term.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        Specification<User> specification = (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("role"), Role.CUSTOMER));
            if (status != null) predicates.add(builder.equal(root.get("status"), status.name()));
            if (!term.isEmpty()) {
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("fullName")), pattern, '!'),
                        builder.like(builder.lower(root.get("email")), pattern, '!'),
                        builder.like(root.get("phone"), pattern, '!')));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
        var result = users.findAll(specification, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return new CustomerPage(result.getContent().stream().map(AdminUserService::toCustomer).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    private void requireAdmin() {
        if (CurrentActor.require().role() != Role.ADMIN) throw new ApiException(ErrorCode.FORBIDDEN);
    }

    private static Customer toCustomer(User user) {
        return new Customer(user.getId(), user.getFullName(), maskedEmail(user.getEmail()), maskedPhone(user.getPhone()),
                user.getStatus(), user.getCreatedAt());
    }

    private static String maskedEmail(String email) {
        if (email == null || email.isBlank()) return null;
        int separator = email.lastIndexOf('@');
        return separator > 0 ? email.substring(0, 1) + "***" + email.substring(separator) : "***";
    }

    private static String maskedPhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        return phone.length() > 4 ? "***" + phone.substring(phone.length() - 4) : "***";
    }

    private static AdminUserResponse toResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getRole() == Role.CUSTOMER ? maskedEmail(user.getEmail()) : user.getEmail(),
                user.getRole() == Role.CUSTOMER ? maskedPhone(user.getPhone()) : user.getPhone(),
                user.getRole(),
                user.getStoreId(),
                user.getStatus()
        );
    }
}
