package com.clucky.notificationservice.repository;

import com.clucky.notificationservice.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Optional<Notification> findByIdAndUserId(Long id, Long userId);
    org.springframework.data.domain.Page<Notification> findByUserId(Long userId, org.springframework.data.domain.Pageable pageable);
}
