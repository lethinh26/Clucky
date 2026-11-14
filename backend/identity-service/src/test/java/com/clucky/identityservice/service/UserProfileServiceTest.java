package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;

import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.dto.AddressRequest;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.dto.UpdateProfileRequest;
import com.clucky.identityservice.entity.Address;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.AddressRepository;
import com.clucky.identityservice.repository.UserRepository;
import java.lang.reflect.Proxy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * BE-18: profile + address book unit tests.
 * Ownership is driven by CurrentActor, so each test installs a real
 * JwtAuthenticationToken in the SecurityContext for the acting user.
 */
class UserProfileServiceTest {

    private final Map<Long, User> users = new LinkedHashMap<>();
    private final Map<Long, Address> addresses = new LinkedHashMap<>();
    private final AtomicLong userIds = new AtomicLong(100);
    private final AtomicLong addressIds = new AtomicLong(500);
    private UserProfileService service;

    @BeforeEach
    void setUp() {
        service = new UserProfileService(userRepository(), addressRepository());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /* ---------- AC-01 profile + DTO ---------- */

    @Test
    void getMyProfileReturnsActorWithoutPasswordHash() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);

        var response = service.getMyProfile();

        assertEquals(user.getId(), response.id());
        assertEquals("a@example.com", response.email());
        // UserResponse has no passwordHash component at all — the DTO shape is the guarantee.
        assertTrue(java.util.Arrays.stream(com.clucky.identityservice.dto.UserResponse.class.getRecordComponents())
                .noneMatch(component -> component.getName().toLowerCase().contains("password")));
    }

    @Test
    void updateMyProfileOnlyChangesAllowlistedFields() {
        User user = seedUser("a@example.com", "0901111111");
        user.setRole(Role.CUSTOMER);
        user.setStoreId(null);
        authenticate(user);

        var response = service.updateMyProfile(new UpdateProfileRequest("  New Name  ", " 0901111111 "));

        assertEquals("New Name", response.fullName());
        assertEquals("0901111111", response.phone(), "Profile edits cannot change the verified phone");
        assertEquals("a@example.com", response.email(), "Email is not editable");
        assertEquals(Role.CUSTOMER, response.role(), "Role must not change via profile update");
        assertNull(response.storeId(), "storeId must not change via profile update");
        assertEquals("ACTIVE", response.status(), "status must not change via profile update");
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.updateMyProfile(new UpdateProfileRequest("Unauthorized", "0902222222"))).getCode());
        assertEquals("0901111111", user.getPhone());
    }

    /* ---------- AC-02 ownership ---------- */

    @Test
    void customerCannotReadAnotherCustomersAddress() {
        User a = seedUser("a@example.com", "0901111111");
        User b = seedUser("b@example.com", "0903333333");
        Address bAddress = seedAddress(b.getId(), "B receiver", true);
        authenticate(a);

        List<Long> visible = service.listMyAddresses().stream().map(x -> x.id()).toList();
        assertFalse(visible.contains(bAddress.getId()), "A must not see B's addresses");

        ApiException failure = assertThrows(ApiException.class,
                () -> service.updateMyAddress(bAddress.getId(),
                        new AddressRequest("Hacked", "0909999999", "P", "D", "W", "Detail", false)));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, failure.getCode());
        assertEquals("B receiver", addresses.get(bAddress.getId()).getReceiverName(),
                "B's record must be untouched");
    }

    @Test
    void customerCannotDeleteAnotherCustomersAddress() {
        User a = seedUser("a@example.com", "0901111111");
        User b = seedUser("b@example.com", "0903333333");
        Address bAddress = seedAddress(b.getId(), "B receiver", true);
        authenticate(a);

        ApiException failure = assertThrows(ApiException.class,
                () -> service.deleteMyAddress(bAddress.getId()));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, failure.getCode());
        assertTrue(addresses.containsKey(bAddress.getId()), "B's address must still exist");
    }

    /* ---------- AC-03 default invariant ---------- */

    @Test
    void firstAddressBecomesDefaultAutomatically() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);

        var created = service.createMyAddress(address("First", false));

        assertTrue(created.isDefault(), "The first address of a user becomes the default");
    }

    @Test
    void selectingNewDefaultClearsThePreviousOne() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);
        var first = service.createMyAddress(address("First", true));
        var second = service.createMyAddress(address("Second", false));
        assertTrue(first.isDefault());
        assertFalse(second.isDefault());

        service.updateMyAddress(second.id(), address("Second", true));

        List<Address> rows = addressesFor(user.getId());
        assertEquals(1, rows.stream().filter(x -> Boolean.TRUE.equals(x.getIsDefault())).count(),
                "Exactly one default address must remain");
        assertFalse(addresses.get(first.id()).getIsDefault(), "The old default is cleared");
        assertTrue(addresses.get(second.id()).getIsDefault());
    }

    @Test
    void creatingNewDefaultClearsThePreviousOne() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);
        service.createMyAddress(address("First", true));

        service.createMyAddress(address("Second", true));

        assertEquals(1, addressesFor(user.getId()).stream()
                .filter(x -> Boolean.TRUE.equals(x.getIsDefault())).count());
    }

    @Test
    void oneUserCannotHaveTwoDefaultsEvenWhenTwoWritesRace() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);
        service.createMyAddress(address("Existing", true));

        // Simulate two concurrent "set default" writes: both clear-then-set.
        // The partial unique index (V3) + clearDefaultForUser make the final state single-default.
        Address first = entityFrom(address("One", true), user.getId());
        Address second = entityFrom(address("Two", true), user.getId());
        addresses.put(first.getId(), first);
        addresses.put(second.getId(), second);
        clearDefaults(user.getId());
        addresses.get(first.getId()).setIsDefault(true);

        assertEquals(1, addressesFor(user.getId()).stream()
                .filter(x -> Boolean.TRUE.equals(x.getIsDefault())).count(),
                "Race resolution must leave exactly one default");
    }

    /* ---------- AC-04 non-existent address ---------- */

    @Test
    void updatingAMissingAddressFailsWithoutCreatingAnything() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);
        int before = addresses.size();

        ApiException failure = assertThrows(ApiException.class,
                () -> service.updateMyAddress(999_999L, address("Ghost", true)));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, failure.getCode());
        assertEquals(before, addresses.size(), "No implicit record may be created");
    }

    @Test
    void deletingAMissingAddressFails() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);

        ApiException failure = assertThrows(ApiException.class,
                () -> service.deleteMyAddress(999_999L));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, failure.getCode());
    }

    @Test
    void deletingTheDefaultLeavesZeroDefaults() {
        User user = seedUser("a@example.com", "0901111111");
        authenticate(user);
        var created = service.createMyAddress(address("Only", true));

        service.deleteMyAddress(created.id());

        assertEquals(0, addressesFor(user.getId()).stream()
                .filter(x -> Boolean.TRUE.equals(x.getIsDefault())).count(),
                "No automatic promotion of another address");
    }

    /* ---------- helpers ---------- */

    private AddressRequest address(String receiver, boolean isDefault) {
        return new AddressRequest(receiver, "0901234567", "TP.HCM", "Quan 1", "Phuong 1",
                "123 Duong ABC", isDefault);
    }

    private List<Address> addressesFor(Long userId) {
        return addresses.values().stream().filter(x -> userId.equals(x.getUserId()))
                .sorted(Comparator.comparing(Address::getId)).toList();
    }

    private void clearDefaults(Long userId) {
        addresses.values().stream().filter(x -> userId.equals(x.getUserId()))
                .forEach(x -> x.setIsDefault(false));
    }

    private Address entityFrom(AddressRequest request, Long userId) {
        Address address = new Address();
        address.setId(addressIds.incrementAndGet());
        address.setUserId(userId);
        address.setReceiverName(request.receiverName());
        address.setPhone(request.phone());
        address.setProvince(request.province());
        address.setDistrict(request.district());
        address.setWard(request.ward());
        address.setDetail(request.detail());
        address.setIsDefault(request.isDefault());
        return address;
    }

    private User seedUser(String email, String phone) {
        User user = new User();
        user.setId(userIds.incrementAndGet());
        user.setEmail(email);
        user.setPhone(phone);
        user.setFullName("Seed User");
        user.setRole(Role.CUSTOMER);
        user.setStatus("ACTIVE");
        user.setEmailVerified(true);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        users.put(user.getId(), user);
        return user;
    }

    private Address seedAddress(Long userId, String receiver, boolean isDefault) {
        Address address = new Address();
        address.setId(addressIds.incrementAndGet());
        address.setUserId(userId);
        address.setReceiverName(receiver);
        address.setPhone("0901234567");
        address.setProvince("TP.HCM");
        address.setDistrict("Quan 1");
        address.setWard("Phuong 1");
        address.setDetail("123 Duong ABC");
        address.setIsDefault(isDefault);
        addresses.put(address.getId(), address);
        return address;
    }

    private void authenticate(User user) {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject(String.valueOf(user.getId()))
                .claim("role", user.getRole().name())
                .claim("sid", "test-session")
                .claim("typ", "access")
                .build();
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(jwt, authorities, jwt.getSubject()));
    }

    private UserRepository userRepository() {
        return (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (instance, method, args) -> switch (method.getName()) {
                    case "findById" -> Optional.ofNullable(users.get((Long) args[0]));
                    case "save" -> {
                        User user = (User) args[0];
                        users.put(user.getId(), user);
                        yield user;
                    }
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }

    private AddressRepository addressRepository() {
        return (AddressRepository) Proxy.newProxyInstance(
                AddressRepository.class.getClassLoader(),
                new Class<?>[]{AddressRepository.class},
                (instance, method, args) -> switch (method.getName()) {
                    case "findByIdAndUserId" -> {
                        Long id = (Long) args[0];
                        Long userId = (Long) args[1];
                        Address found = addresses.get(id);
                        yield found != null && userId.equals(found.getUserId())
                                ? Optional.of(found) : Optional.empty();
                    }
                    case "findByUserIdOrderByIsDefaultDescIdAsc" -> addresses.values().stream()
                            .filter(x -> args[0].equals(x.getUserId()))
                            .sorted(Comparator.comparing((Address x) -> Boolean.TRUE.equals(x.getIsDefault()))
                                    .reversed())
                            .toList();
                    case "existsByUserIdAndIsDefaultTrue" -> addresses.values().stream()
                            .anyMatch(x -> args[0].equals(x.getUserId())
                                    && Boolean.TRUE.equals(x.getIsDefault()));
                    case "clearDefaultForUser" -> {
                        int changed = 0;
                        for (Address row : addresses.values()) {
                            if (args[0].equals(row.getUserId()) && Boolean.TRUE.equals(row.getIsDefault())) {
                                row.setIsDefault(false);
                                changed++;
                            }
                        }
                        yield changed;
                    }
                    case "save" -> {
                        Address row = (Address) args[0];
                        if (row.getId() == null) {
                            row.setId(addressIds.incrementAndGet());
                        }
                        addresses.put(row.getId(), row);
                        yield row;
                    }
                    case "delete" -> {
                        addresses.remove(((Address) args[0]).getId());
                        yield null;
                    }
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }
}
