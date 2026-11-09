package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.Address;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AddressRepository extends JpaRepository<Address, Long> {
    java.util.List<Address> findByUserIdOrderByIdAsc(Long userId);
    Optional<Address> findByIdAndUserId(Long id, Long userId);

    List<Address> findByUserIdOrderByIsDefaultDescIdAsc(Long userId);

    boolean existsByUserIdAndIsDefaultTrue(Long userId);

    @Modifying
    @Query("UPDATE Address a SET a.isDefault = false WHERE a.userId = :userId AND a.isDefault = true")
    int clearDefaultForUser(@Param("userId") Long userId);
}
