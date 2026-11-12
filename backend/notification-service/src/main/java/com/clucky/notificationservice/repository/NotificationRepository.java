package com.clucky.notificationservice.repository;

import com.clucky.notificationservice.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    Optional<Notification> findByOperationKey(String operationKey);

    Page<Notification> findByUserId(Long userId, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND (:unread = false OR n.isRead = false) AND (:type IS NULL OR n.type = :type)")
    Page<Notification> findInbox(@Param("userId") Long userId, @Param("unread") boolean unread,
            @Param("type") String type, Pageable pageable);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId AND n.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);

    long countByUserIdAndIsReadFalse(Long userId);
}
