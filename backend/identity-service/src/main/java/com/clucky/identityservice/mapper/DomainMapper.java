package com.clucky.identityservice.mapper;

import com.clucky.identityservice.dto.*;
import com.clucky.identityservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static UserResponse toResponse(User entity) {
        return new UserResponse(
                entity.getId(),
                entity.getEmail(),
                entity.getPhone(),
                entity.getFullName(),
                entity.getAvatarUrl(),
                entity.getAvatarPublicId(),
                entity.getRole(),
                entity.getStoreId(),
                entity.getStatus(),
                entity.getEmailVerified(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static AddressResponse toResponse(Address entity) {
        return new AddressResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getReceiverName(),
                entity.getPhone(),
                entity.getProvince(),
                entity.getDistrict(),
                entity.getWard(),
                entity.getDetail(),
                entity.getIsDefault()
        );
    }

    public static RefreshTokenResponse toResponse(RefreshToken entity) {
        return new RefreshTokenResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getExpiresAt(),
                entity.getRevoked(),
                entity.getCreatedAt()
        );
    }

    public static OtpCodeResponse toResponse(OtpCode entity) {
        return new OtpCodeResponse(
                entity.getId(),
                entity.getIdentifier(),
                entity.getPurpose(),
                entity.getExpiresAt(),
                entity.getUsed(),
                entity.getCreatedAt()
        );
    }

    public static ShiftResponse toResponse(Shift entity) {
        return new ShiftResponse(
                entity.getId(),
                entity.getStoreId(),
                entity.getName(),
                entity.getStartTime(),
                entity.getEndTime()
        );
    }

    public static StaffScheduleResponse toResponse(StaffSchedule entity) {
        return new StaffScheduleResponse(
                entity.getId(),
                entity.getStaffId(),
                entity.getStoreId(),
                entity.getShiftId(),
                entity.getWorkDate(),
                entity.getStatus()
        );
    }
}
