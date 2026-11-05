package com.clucky.identityservice.controller;

import com.clucky.identityservice.dto.AddressRequest;
import com.clucky.identityservice.dto.AddressResponse;
import com.clucky.identityservice.dto.UpdateProfileRequest;
import com.clucky.identityservice.dto.UserResponse;
import com.clucky.identityservice.service.UserProfileService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * BE-18: self profile + address book endpoints. All ownership is derived from
 * the verified JWT (CurrentActor) — no user id is accepted from the client.
 */
@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserProfileService service;

    public UserController(UserProfileService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public UserResponse me() {
        return service.getMyProfile();
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public UserResponse updateMe(@Valid @RequestBody UpdateProfileRequest request) {
        return service.updateMyProfile(request);
    }

    @GetMapping("/addresses")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<AddressResponse> myAddresses() {
        return service.listMyAddresses();
    }

    @PostMapping("/addresses")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public AddressResponse createAddress(@Valid @RequestBody AddressRequest request) {
        return service.createMyAddress(request);
    }

    @PutMapping("/addresses/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public AddressResponse updateAddress(@PathVariable Long id,
            @Valid @RequestBody AddressRequest request) {
        return service.updateMyAddress(id, request);
    }

    @DeleteMapping("/addresses/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddress(@PathVariable Long id) {
        service.deleteMyAddress(id);
    }
}
