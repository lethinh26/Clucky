package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

}
