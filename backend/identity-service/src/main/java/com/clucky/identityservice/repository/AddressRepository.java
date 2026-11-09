package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Long> {
    java.util.List<Address> findByUserIdOrderByIdAsc(Long userId);
    Optional<Address> findByIdAndUserId(Long id, Long userId);
}
