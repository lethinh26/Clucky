package com.clucky.paymentservice.repository;

import com.clucky.paymentservice.entity.WebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebhookLogRepository extends JpaRepository<WebhookLog, Long> {

}
