package com.clucky.identityservice.repository;

import com.clucky.identityservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from User account where account.loginName = :login or (account.loginName is null and account.email = :login)")
    Optional<User> findByLogin(@Param("login") String login);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from User account where account.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
    Optional<User> findByIdAndStoreId(Long id, Long storeId);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<User> findByFirebaseUid(String firebaseUid);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from User account where account.email = :email")
    Optional<User> findByEmailForGoogle(@Param("email") String email);
}
