package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.StaffSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StaffScheduleRepository extends JpaRepository<StaffSchedule, Long> {
    Optional<StaffSchedule> findByIdAndStoreId(Long id, Long storeId);
}
