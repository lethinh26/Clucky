package com.clucky.reviewreportservice.repository;

import com.clucky.reviewreportservice.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    Page<AuditLog> findByStoreIdOrderByCreatedAtDesc(Long storeId, Pageable pageable);

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
