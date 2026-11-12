package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.dto.AdminCustomerData.*;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {
    @Mock private UserRepository users;
    @Mock private RefreshTokenService sessions;
    @Mock private JdbcTemplate jdbc;
    @Mock private IdentityAuditService audit;
    private AdminUserService service;

    @BeforeEach
    void setUp() {
        service = new AdminUserService(users, sessions, jdbc, audit);
        actor(Role.ADMIN, null);
    }

    @AfterEach
    void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    @Test
    void legacyAssignmentCannotMoveAnyAccountOrBypassProvisioning() {
        assertEquals(ErrorCode.METHOD_NOT_ALLOWED, assertThrows(ApiException.class,
                () -> service.assignStore(2L, 7L)).getCode());
        assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                () -> service.assignStore(2L, 0L)).getCode());
        actor(Role.STORE_MANAGER, 7L);
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> service.assignStore(2L, 7L)).getCode());
        verifyNoInteractions(users, sessions, jdbc, audit);
    }

    @Test
    void locksCurrentBranchAccountAndRevokesSessionsWithDurableAudit() {
        User manager = user(2L, Role.STORE_MANAGER);
        ReflectionTestUtils.setField(manager, "currentBranchAccount", true);
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(manager));

        var result = service.setLocked(2L, true, null);

        assertEquals("LOCKED", result.status());
        verify(jdbc).execute("SELECT pg_advisory_xact_lock(192615)");
        verify(users).save(manager);
        verify(sessions).revokeAllForUser(2L);
        verify(audit).record(1L, "ADMIN", 7L, "session-1", "ACCOUNT_LOCKED", 2L, "Account",
                Map.of("beforeStatus", "ACTIVE", "afterStatus", "LOCKED", "reason", "", "result", "SUCCESS"), null);
    }

    @Test
    void unlocksCurrentBranchAccountWithoutChangingItsSlot() {
        User staff = user(2L, Role.STAFF);
        staff.setStatus("LOCKED");
        ReflectionTestUtils.setField(staff, "currentBranchAccount", true);
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(staff));

        assertEquals("ACTIVE", service.setLocked(2L, false, null).status());
        assertTrue(staff.isCurrentBranchAccount());
        assertEquals(7L, staff.getStoreId());
        assertEquals(Role.STAFF, staff.getRole());
        verify(sessions).revokeAllForUser(2L);
    }

    @Test
    void neitherAdminNorManagerCanUnlockRetiredStaff() {
        User retired = user(2L, Role.STAFF);
        retired.setStatus("LOCKED");
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(retired));
        when(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM identity_service.branch_accounts WHERE store_id=?)",
                Boolean.class, 7L)).thenReturn(true);

        for (Role role : List.of(Role.ADMIN, Role.STORE_MANAGER)) {
            actor(role, 7L);
            assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                    () -> service.setLocked(2L, false, null)).getCode());
        }
        assertEquals("LOCKED", retired.getStatus());
        verify(users, never()).save(any());
        verifyNoInteractions(sessions, audit);
    }

    @Test
    void keepsUnmigratedBranchUnlockWorkflow() {
        User legacy = user(2L, Role.STAFF);
        legacy.setStatus("LOCKED");
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(legacy));
        when(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM identity_service.branch_accounts WHERE store_id=?)",
                Boolean.class, 7L)).thenReturn(false);
        actor(Role.STORE_MANAGER, 7L);
        assertEquals("ACTIVE", service.setLocked(2L, false, null).status());
        verify(sessions).revokeAllForUser(2L);
    }

    @Test
    void managerCannotMutateOtherBranchOrCustomers() {
        User staff = user(2L, Role.STAFF);
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(staff));
        actor(Role.STORE_MANAGER, 8L);
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> service.setLocked(2L, true, null)).getCode());
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> service.setCustomerLocked(2L, true, new StatusChange("Violation", Status.ACTIVE))).getCode());
        verify(users, never()).save(any());
        verifyNoInteractions(sessions, audit);
    }

    @Test
    void locksCustomerWithReasonExpectedStatusAndMaskedResponse() {
        User customer = user(2L, Role.CUSTOMER);
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(customer));

        var result = service.setCustomerLocked(2L, true, new StatusChange("  Violation  ", Status.ACTIVE));

        assertEquals("LOCKED", result.status());
        assertEquals("c***@example.com", result.maskedEmail());
        assertEquals("***5678", result.maskedPhone());
        assertEquals(Role.CUSTOMER, customer.getRole());
        verify(sessions).revokeAllForUser(2L);
        verify(audit).record(1L, "ADMIN", null, "session-1", "CUSTOMER_LOCKED", 2L, "Customer",
                Map.of("beforeStatus", "ACTIVE", "afterStatus", "LOCKED", "reason", "Violation", "result", "SUCCESS"), null);
    }

    @Test
    void unlockRevokesSessionsInsteadOfRestoringOldTokens() {
        User customer = user(2L, Role.CUSTOMER);
        customer.setStatus("LOCKED");
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(customer));
        assertEquals("ACTIVE", service.setCustomerLocked(2L, false, new StatusChange("Resolved", Status.LOCKED)).status());
        verify(sessions).revokeAllForUser(2L);
    }

    @Test
    void legacyCustomerEndpointCannotSkipReasonOrStaleStateChecks() {
        User customer = user(2L, Role.CUSTOMER);
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(customer));
        assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                () -> service.setLocked(2L, true, null)).getCode());
        assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                () -> service.setCustomerLocked(2L, true, new StatusChange("  ", Status.ACTIVE))).getCode());
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.setCustomerLocked(2L, true, new StatusChange("Violation", Status.LOCKED))).getCode());
        verify(users, never()).save(any());
        verifyNoInteractions(sessions, audit);
    }

    @Test
    void customerEndpointCannotTargetOrPromoteInternalAccounts() {
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(user(2L, Role.ADMIN)));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, assertThrows(ApiException.class,
                () -> service.setCustomerLocked(2L, true, new StatusChange("Violation", Status.ACTIVE))).getCode());
        verify(users, never()).save(any());
        verifyNoInteractions(sessions, audit);
    }

    @Test
    void unchangedStatusDoesNotEmitDuplicateAudit() {
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(user(2L, Role.CUSTOMER)));
        service.setCustomerLocked(2L, false, new StatusChange("Resolved", Status.ACTIVE));
        verify(users, never()).save(any());
        verifyNoInteractions(sessions, audit);
    }

    @Test
    void rejectsAdminSelfLock() {
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user(1L, Role.ADMIN)));
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> service.setLocked(1L, true, null)).getCode());
        verify(users, never()).save(any());
        verifyNoInteractions(sessions, audit);
    }

    @Test
    void customerListIsAdminOnlyAndPaginationIsBounded() {
        for (Role role : List.of(Role.STORE_MANAGER, Role.STAFF, Role.CUSTOMER, Role.SHIPPER)) {
            actor(role, 7L);
            assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                    () -> service.listCustomers(null, null, 0, 20)).getCode());
        }
        actor(Role.ADMIN, null);
        assertThrows(ApiException.class, () -> service.listCustomers(null, null, -1, 20));
        assertThrows(ApiException.class, () -> service.listCustomers(null, null, 0, 101));
        assertThrows(ApiException.class, () -> service.listCustomers("x".repeat(256), null, 0, 20));
        verifyNoInteractions(users);
    }

    @Test
    @SuppressWarnings("unchecked")
    void customerListUsesServerPaginationCustomerScopeAndLiteralSearch() throws Exception {
        User customer = user(42L, Role.CUSTOMER);
        when(users.findAll(ArgumentMatchers.<Specification<User>>any(), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<>(List.of(customer), invocation.getArgument(1), 41));
        var result = service.listCustomers(" An%_! ", Status.ACTIVE, 2, 20);
        assertEquals(2, result.page());
        assertEquals(41, result.totalElements());
        assertEquals(3, result.totalPages());
        assertEquals(42L, result.content().getFirst().id());
        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(result);
        assertFalse(json.contains("customer@example.com"));
        assertFalse(json.contains("0901235678"));
        assertFalse(json.contains("password"));
        assertFalse(json.contains("firebase"));

        ArgumentCaptor<Specification<User>> filter = ArgumentCaptor.forClass(Specification.class);
        ArgumentCaptor<Pageable> paging = ArgumentCaptor.forClass(Pageable.class);
        verify(users).findAll(filter.capture(), paging.capture());
        assertEquals(Sort.by(Sort.Direction.DESC, "id"), paging.getValue().getSort());
        Root<User> root = mock(Root.class);
        CriteriaBuilder builder = mock(CriteriaBuilder.class);
        Path<Role> rolePath = mock(Path.class);
        Path<String> statusPath = mock(Path.class);
        Path<String> namePath = mock(Path.class);
        Path<String> emailPath = mock(Path.class);
        Path<String> phonePath = mock(Path.class);
        when(root.<Role>get("role")).thenReturn(rolePath);
        when(root.<String>get("status")).thenReturn(statusPath);
        when(root.<String>get("fullName")).thenReturn(namePath);
        when(root.<String>get("email")).thenReturn(emailPath);
        when(root.<String>get("phone")).thenReturn(phonePath);
        Expression<String> lowerName = mock(Expression.class);
        Expression<String> lowerEmail = mock(Expression.class);
        when(builder.lower(namePath)).thenReturn(lowerName);
        when(builder.lower(emailPath)).thenReturn(lowerEmail);
        filter.getValue().toPredicate(root, mock(CriteriaQuery.class), builder);
        verify(builder).equal(rolePath, Role.CUSTOMER);
        verify(builder).equal(statusPath, "ACTIVE");
        verify(builder).like(phonePath, "%an!%!_!!%", '!');
    }

    @Test
    void listsLegacyUsersWithRequestedFilters() {
        when(users.findAll(ArgumentMatchers.<Specification<User>>any(), any(Sort.class)))
                .thenReturn(List.of(user(2L, Role.STORE_MANAGER)));
        assertEquals(Role.STORE_MANAGER, service.listUsers(Role.STORE_MANAGER, 7L, "manager").getFirst().role());
    }

    private static void actor(Role role, Long storeId) {
        var builder = Jwt.withTokenValue("test-token").header("alg", "HS256").subject("1")
                .claim("role", role.name()).claim("sid", "session-1");
        if (storeId != null) builder.claim("storeId", storeId);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(),
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))));
    }

    private static User user(Long id, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail("customer@example.com");
        user.setPhone("0901235678");
        user.setPasswordHash("password-never-exposed");
        user.setFirebaseUid("firebase-never-exposed");
        user.setFullName("Khách hàng");
        user.setRole(role);
        user.setStoreId(role == Role.CUSTOMER ? null : 7L);
        user.setStatus("ACTIVE");
        user.setCreatedAt(Instant.parse("2026-11-10T00:00:00Z"));
        return user;
    }
}
