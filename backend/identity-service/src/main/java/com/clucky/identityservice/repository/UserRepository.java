package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.dto.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByIdAndStoreId(Long id, Long storeId);
    Optional<User> findByEmail(String email);
    Optional<User> findByIdAndRole(@Param("id") Long id, @Param("role") Role role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from User account where account.id = :id and account.role = :role")
    Optional<User> findByIdAndRoleForUpdate(@Param("id") Long id, @Param("role") Role role);

    @Query("select account from User account where account.role = :role and (:search is null or lower(account.fullName) like lower(concat('%', :search, '%')) or lower(account.email) like lower(concat('%', :search, '%')) or lower(coalesce(account.phone, '')) like lower(concat('%', :search, '%'))) and (:status is null or account.status = :status)")
    org.springframework.data.domain.Page<User> findCustomers(@Param("role") Role role, @Param("search") String search, @Param("status") String status, org.springframework.data.domain.Pageable pageable);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<User> findByFirebaseUid(String firebaseUid);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from User account where account.email = :email")
    Optional<User> findByEmailForGoogle(@Param("email") String email);
}
