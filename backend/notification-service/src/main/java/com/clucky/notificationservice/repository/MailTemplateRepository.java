package com.clucky.notificationservice.repository;

import com.clucky.notificationservice.entity.MailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MailTemplateRepository extends JpaRepository<MailTemplate, Long> {
    Optional<MailTemplate> findByTemplateKey(String templateKey);

    Optional<MailTemplate> findByTemplateKeyAndIsActiveTrue(String templateKey);
}
