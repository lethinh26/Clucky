package com.clucky.notificationservice.repository;

import com.clucky.notificationservice.entity.MailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MailTemplateRepository extends JpaRepository<MailTemplate, Long> {

}
