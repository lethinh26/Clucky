package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.repository.UserRepository;
import java.util.Optional;
import org.mockito.ArgumentMatchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {
    @Mock
    private UserRepository users;

    @Mock
    private AuthService authService;

    private AdminUserService service;

    @BeforeEach
    void setUp() {
        service = new AdminUserService(users, authService);
        Jwt jwt = Jwt.withTokenValue("admin-token")
                .header("alg", "HS256")
                .subject("1")
                .claim("role", "ADMIN")
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    @org.junit.jupiter.api.AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void assignsStoreToStoreManager() {
        User manager = user(2L, Role.STORE_MANAGER);
        when(users.findById(2L)).thenReturn(Optional.of(manager));
        when(users.save(manager)).thenReturn(manager);

        var result = service.assignStore(2L, 7L);

        assertEquals(7L, result.storeId());
        verify(users).save(manager);
    }

    @Test
    void rejectsStoreAssignmentToCustomer() {
        when(users.findById(2L)).thenReturn(Optional.of(user(2L, Role.CUSTOMER)));

        assertThrows(ApiException.class, () -> service.assignStore(2L, 7L));
    }

    @Test
    void locksUserAndRevokesTheirSessions() {
        User manager = user(2L, Role.STORE_MANAGER);
        when(users.findById(2L)).thenReturn(Optional.of(manager));
        doAnswer(invocation -> {
            manager.setStatus(AuthService.STATUS_LOCKED);
            return null;
        }).when(authService).revokeAllSessionsForLockedAccount(manager);

        var result = service.setLocked(2L, true);

        assertEquals("LOCKED", result.status());
        verify(authService).revokeAllSessionsForLockedAccount(manager);
    }

    @Test
    void listsUsersWithTheRequestedFilters() {
        when(users.findAll(ArgumentMatchers.<Specification<User>>any(), any(Sort.class)))
                .thenReturn(java.util.List.of(user(2L, Role.STORE_MANAGER)));

        var result = service.listUsers(Role.STORE_MANAGER, 7L, "manager");

        assertEquals(1, result.size());
        assertEquals(Role.STORE_MANAGER, result.get(0).role());
    }

    private static User user(Long id, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail("user@clucky.local");
        user.setFullName("Store Manager");
        user.setRole(role);
        user.setStoreId(7L);
        user.setStatus("ACTIVE");
        return user;
    }
}
