package com.clucky.identityservice.service;

import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.dto.AddressRequest;
import com.clucky.identityservice.dto.AddressResponse;
import com.clucky.identityservice.dto.UpdateProfileRequest;
import com.clucky.identityservice.dto.UserResponse;
import com.clucky.identityservice.entity.Address;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.mapper.DomainMapper;
import com.clucky.identityservice.repository.AddressRepository;
import com.clucky.identityservice.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * BE-18: self-service profile + address book.
 *
 * Zero-trust ownership: userId always comes from CurrentActor (verified JWT),
 * never from request parameters. Cross-user access returns RESOURCE_NOT_FOUND
 * so other users' address IDs are not enumerable.
 */
@Service
public class UserProfileService {

    private final UserRepository users;
    private final AddressRepository addresses;

    public UserProfileService(UserRepository users, AddressRepository addresses) {
        this.users = users;
        this.addresses = addresses;
    }

    /* ---------- Profile ---------- */

    @Transactional
    public UserResponse updateMyProfile(UpdateProfileRequest request) {
        User user = loadActor();
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone().trim());
        user.setUpdatedAt(Instant.now());
        try {
            user = users.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        return DomainMapper.toResponse(user);
    }

    public UserResponse getMyProfile() {
        return DomainMapper.toResponse(loadActor());
    }

    /* ---------- Address book ---------- */

    public List<AddressResponse> listMyAddresses() {
        return addresses.findByUserIdOrderByIsDefaultDescIdAsc(actorId())
                .stream().map(DomainMapper::toResponse).toList();
    }

    @Transactional
    public AddressResponse createMyAddress(AddressRequest request) {
        Long userId = actorId();
        Address address = new Address();
        applyRequest(address, request, userId);
        if (request.isDefault() || !addresses.existsByUserIdAndIsDefaultTrue(userId)) {
            addresses.clearDefaultForUser(userId);
            address.setIsDefault(true);
        }
        try {
            return DomainMapper.toResponse(addresses.save(address));
        } catch (DataIntegrityViolationException e) {
            // Concurrent default set: the partial unique index (V3) protects consistency.
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
    }

    @Transactional
    public AddressResponse updateMyAddress(Long addressId, AddressRequest request) {
        Long userId = actorId();
        Address address = addresses.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        applyRequest(address, request, userId);
        if (request.isDefault() && !Boolean.TRUE.equals(address.getIsDefault())) {
            addresses.clearDefaultForUser(userId);
            address.setIsDefault(true);
        }
        try {
            return DomainMapper.toResponse(addresses.save(address));
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
    }

    @Transactional
    public void deleteMyAddress(Long addressId) {
        Long userId = actorId();
        Address address = addresses.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        addresses.delete(address);
        // Deleting the default address leaves zero defaults (no auto-promote).
    }

    /* ---------- Helpers ---------- */

    private User loadActor() {
        Long userId = CurrentActor.require().userId();
        return users.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private Long actorId() {
        return CurrentActor.require().userId();
    }

    private void applyRequest(Address address, AddressRequest request, Long userId) {
        address.setUserId(userId);
        address.setReceiverName(request.receiverName().trim());
        address.setPhone(request.phone().trim());
        address.setProvince(request.province().trim());
        address.setDistrict(request.district().trim());
        address.setWard(request.ward().trim());
        address.setDetail(request.detail().trim());
    }
}
