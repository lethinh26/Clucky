package com.clucky.notificationservice.repository;

import com.clucky.notificationservice.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    Optional<EmailLog> findByMessageId(String messageId);

    List<EmailLog> findByStatus(String status);

    List<EmailLog> findByEventId(String eventId);
}
