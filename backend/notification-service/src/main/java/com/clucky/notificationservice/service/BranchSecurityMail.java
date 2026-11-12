package com.clucky.notificationservice.service;

import com.clucky.notificationservice.dto.EmailMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Set;

@Service
public class BranchSecurityMail {
    private final ObjectMapper mapper;
    private final Validator validator;
    private final EmailSenderService deliveries;
    private final String securityTopic;
    private final String requestTopic;

    public BranchSecurityMail(ObjectMapper mapper, Validator validator, EmailSenderService deliveries,
            @org.springframework.beans.factory.annotation.Value("${clucky.kafka.security-email-topic}") String securityTopic,
            @org.springframework.beans.factory.annotation.Value("${clucky.kafka.email-request-topic}") String requestTopic) {
        this.mapper = mapper;
        this.validator = validator;
        this.deliveries = deliveries;
        this.securityTopic = securityTopic;
        this.requestTopic = requestTopic;
    }

    @KafkaListener(topics = {"${clucky.kafka.security-email-topic}", "${clucky.kafka.email-request-topic}"},
            groupId = "${clucky.kafka.email-consumer-group}")
    public void receive(ConsumerRecord<String, String> record, Acknowledgment acknowledgment) {
        try {
            EmailMessage message = mapper.readValue(record.value(), EmailMessage.class);
            boolean branch = "branch-security".equals(message.template());
            if (!validator.validate(message).isEmpty()
                    || !Set.of("branch-security", "register-otp", "reset-password-otp").contains(message.template())
                    || !record.topic().equals(branch ? securityTopic : requestTopic)
                    || !message.variables().getOrDefault("otp", "").matches(branch ? "[0-9]{8}" : "[0-9]{6}")) {
                throw new IllegalArgumentException();
            }
            Instant expiry = Instant.parse(message.variables().get("expiresAt"));
            deliveries.processEmailIntent(message.messageId(), message.eventId(), message.correlationId(),
                    message.recipient(), message.template(), message.variables(), null, expiry);
            acknowledgment.acknowledge();
        } catch (Exception failure) {
            throw new IllegalStateException("Security email intent was not accepted");
        }
    }
}
