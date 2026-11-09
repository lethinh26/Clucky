package com.clucky.identityservice.controller;

import com.clucky.identityservice.entity.Address;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.repository.AddressRepository;
import com.clucky.identityservice.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users/me")
@Transactional
public class ProfileController {
    private final UserRepository users;
    private final AddressRepository addresses;
    private final EntityManager entityManager;

    public ProfileController(UserRepository users, AddressRepository addresses, EntityManager entityManager) {
        this.users = users;
        this.addresses = addresses;
        this.entityManager = entityManager;
    }

    @ModelAttribute
    public void privateResponse(jakarta.servlet.http.HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
    }

    public record Profile(String fullName, String email, String phone) {}
    public record ProfileInput(@NotBlank @Size(max = 160) String fullName,
            @Pattern(regexp = "^$|[0-9+ ()-]{9,30}") String phone) {}
    public record AddressInput(@NotBlank @Size(max = 160) String receiverName,
            @NotBlank @Pattern(regexp = "[0-9+ ()-]{9,30}") String phone,
            @NotNull @Size(max = 100) String province, @NotNull @Size(max = 100) String district,
            @NotNull @Size(max = 100) String ward, @NotBlank @Size(max = 255) String detail,
            boolean isDefault, @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude) {
        @AssertTrue public boolean isCoordinatePairValid() {
            return (latitude == null && longitude == null) || (latitude != null && longitude != null
                    && Double.isFinite(latitude) && Double.isFinite(longitude));
        }
    }
    public record SavedAddress(Long id, String receiverName, String phone, String province, String district,
            String ward, String detail, boolean isDefault, Double latitude, Double longitude) {
        static SavedAddress from(Address address) {
            return new SavedAddress(address.getId(), address.getReceiverName(), address.getPhone(),
                    address.getProvince(), address.getDistrict(), address.getWard(), address.getDetail(),
                    Boolean.TRUE.equals(address.getIsDefault()), address.getLatitude(), address.getLongitude());
        }
    }

    private User user(Jwt jwt, boolean lock) {
        User user = lock ? entityManager.find(User.class, Long.valueOf(jwt.getSubject()), LockModeType.PESSIMISTIC_WRITE)
                : users.findById(Long.valueOf(jwt.getSubject())).orElse(null);
        if (user == null || !"ACTIVE".equals(user.getStatus())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return user;
    }

    @GetMapping
    public Profile profile(@AuthenticationPrincipal Jwt jwt) {
        User user = user(jwt, false);
        return new Profile(user.getFullName(), user.getEmail(), user.getPhone() == null ? "" : user.getPhone());
    }

    @PutMapping
    public Profile update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProfileInput input) {
        User user = user(jwt, true);
        user.setFullName(input.fullName().trim());
        user.setPhone(input.phone() == null || input.phone().isBlank() ? null : input.phone().trim());
        user.setUpdatedAt(Instant.now());
        users.saveAndFlush(user);
        return profile(jwt);
    }

    @GetMapping("/addresses")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<SavedAddress> list(@AuthenticationPrincipal Jwt jwt) {
        return addresses.findByUserIdOrderByIdAsc(user(jwt, false).getId()).stream().map(SavedAddress::from).toList();
    }

    @PostMapping("/addresses")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedAddress create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AddressInput input) {
        return save(user(jwt, true), null, input);
    }

    @PutMapping("/addresses/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public SavedAddress updateAddress(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody AddressInput input) {
        return save(user(jwt, true), id, input);
    }

    private SavedAddress save(User user, Long id, AddressInput input) {
        Address address = id == null ? new Address() : addresses.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<Address> existing = addresses.findByUserIdOrderByIdAsc(user.getId());
        boolean makeDefault = input.isDefault() || existing.isEmpty() || Boolean.TRUE.equals(address.getIsDefault())
                || existing.stream().noneMatch(item -> Boolean.TRUE.equals(item.getIsDefault()));
        if (makeDefault) {
            existing.forEach(item -> item.setIsDefault(false));
            addresses.flush();
        }
        address.setUserId(user.getId());
        address.setReceiverName(input.receiverName().trim());
        address.setPhone(input.phone().trim());
        address.setProvince(input.province().trim());
        address.setDistrict(input.district().trim());
        address.setWard(input.ward().trim());
        address.setDetail(input.detail().trim());
        address.setLatitude(input.latitude());
        address.setLongitude(input.longitude());
        address.setIsDefault(makeDefault);
        return SavedAddress.from(addresses.saveAndFlush(address));
    }

    @DeleteMapping("/addresses/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        User user = user(jwt, true);
        Address address = addresses.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        addresses.delete(address);
        addresses.flush();
        List<Address> remaining = addresses.findByUserIdOrderByIdAsc(user.getId());
        if (!remaining.isEmpty() && remaining.stream().noneMatch(item -> Boolean.TRUE.equals(item.getIsDefault()))) {
            remaining.get(0).setIsDefault(true);
        }
    }
}
