package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByIdAndStoreId(Long id, Long storeId);
}
