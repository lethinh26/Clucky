package com.clucky.identityservice.service;

import com.clucky.identityservice.dto.AdminUserResponse;
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
import java.util.Objects;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {
    private final UserRepository users;
    private final AuthService authService;

    public AdminUserService(UserRepository users, AuthService authService) {
        this.users = users;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(Role role, Long storeId, String keyword) {
        CurrentActor actor = CurrentActor.require();
        boolean admin = actor.role() == Role.ADMIN;
        if (!admin && actor.role() != Role.STORE_MANAGER) {
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
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (user.getRole() != Role.STAFF
                && user.getRole() != Role.STORE_MANAGER
                && user.getRole() != Role.SHIPPER) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        user.setStoreId(storeId);
        return toResponse(users.save(user));
    }

    @Transactional
    public AdminUserResponse setLocked(Long userId, boolean locked) {
        CurrentActor actor = CurrentActor.require();
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (actor.role() == Role.ADMIN) {
            if (locked && Objects.equals(actor.userId(), userId)) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
        } else if (actor.role() != Role.STORE_MANAGER
                || user.getRole() != Role.STAFF
                || !Objects.equals(user.getStoreId(), actor.storeId())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        if (locked) {
            authService.revokeAllSessionsForLockedAccount(user);
        } else {
            user.setStatus(AuthService.STATUS_ACTIVE);
            users.save(user);
        }
        return toResponse(user);
    }

    private static AdminUserResponse toResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStoreId(),
                user.getStatus()
        );
    }
}
