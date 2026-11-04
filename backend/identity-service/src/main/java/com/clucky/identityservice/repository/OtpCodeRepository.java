package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {
    Optional<OtpCode> findFirstByIdentifierAndPurposeAndUsedFalseOrderByCreatedAtDesc(String identifier, String purpose);

    @Modifying
    @Query("UPDATE OtpCode o SET o.used = true WHERE o.identifier = :identifier AND o.purpose = :purpose AND o.used = false")
    int invalidatePrevious(@Param("identifier") String identifier, @Param("purpose") String purpose);

    @Modifying
    @Query("UPDATE OtpCode o SET o.used = true WHERE o.id = :id AND o.used = false")
    int consumeOtp(@Param("id") Long id);
}
