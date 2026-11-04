package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.event.EmailMessage;
import com.clucky.identityservice.logging.SafeLog;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Publishes BE-59 {@code EmailMessage} payloads for the Notification Service.
 *
 * <p>Publishing a message is <em>not</em> proof of delivery: SMTP transport and template rendering belong
 * to the Notification Service (BE-60 / BE-64), which must consume this topic. The plaintext OTP is only
 * placed in the event variables and is never logged.
 */
@Component
public class EmailEventPublisher {
    private static final Logger LOG = LoggerFactory.getLogger(EmailEventPublisher.class);

    public static final String TOPIC = "email.requested";
    public static final String TEMPLATE_REGISTER_OTP = "register-otp";
    public static final String TEMPLATE_RESET_OTP = "reset-password-otp";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final AuthProperties authProperties;

    public EmailEventPublisher(
            @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            AuthProperties authProperties
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.authProperties = authProperties;
    }

    public void publishOtpEmail(String recipient, String template, String otp, Map<String, String> extraVariables) {
        if (recipient == null || recipient.isBlank()) {
            return;
        }

        String incomingCorrelationId = MDC.get("correlationId");
        final String correlationId = incomingCorrelationId != null
                && incomingCorrelationId.matches("[A-Za-z0-9._-]{1,128}")
                ? incomingCorrelationId : UUID.randomUUID().toString();

        String messageId = UUID.randomUUID().toString();
        String eventId = UUID.randomUUID().toString();

        Map<String, String> variables = new HashMap<>();
        if (extraVariables != null) {
            variables.putAll(extraVariables);
        }
        variables.put("otp", otp);
        variables.put("expiresMinutes", String.valueOf(authProperties.otpTtl().toMinutes()));

        EmailMessage message = new EmailMessage(messageId, eventId, correlationId, recipient, template, variables);

        if (kafkaTemplate == null) {
            LOG.warn("event=email_not_published template={} reason=kafka_template_unavailable", template);
            return;
        }

        try {
            String json = objectMapper.writeValueAsString(message);
            ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, recipient, json);
            record.headers().add("X-Correlation-ID", correlationId.getBytes(StandardCharsets.UTF_8));
            record.headers().add("X-Event-ID", eventId.getBytes(StandardCharsets.UTF_8));
            record.headers().add("X-Message-ID", messageId.getBytes(StandardCharsets.UTF_8));

            kafkaTemplate.send(record).whenComplete((result, failure) -> {
                if (failure != null) {
                    LOG.error("event=email_publish_failed correlationId={} template={} trace={}",
                            correlationId, template, SafeLog.trace(failure));
                }
            });
        } catch (Exception failure) {
            LOG.error("event=email_publish_failed correlationId={} template={} trace={}",
                    correlationId, template, SafeLog.trace(failure));
        }
    }
}
