package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.MailSenderProperties;
import com.clucky.notificationservice.dto.EmailMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;

@Service
public class BranchSecurityMail {
    private final ObjectMapper mapper;
    private final Validator validator;
    private final JdbcTemplate jdbc;
    private final MailSenderProperties settings;
    private final JavaMailSenderImpl sender;
    private final TransactionTemplate transactions;
    public BranchSecurityMail(ObjectMapper mapper, Validator validator, JdbcTemplate jdbc,
            MailSenderProperties settings, PlatformTransactionManager manager) {
        this.mapper = mapper; this.validator = validator; this.jdbc = jdbc; this.settings = settings;
        transactions = new TransactionTemplate(manager);
        sender = new JavaMailSenderImpl();
        sender.setHost(settings.host()); sender.setPort(settings.port());
        sender.setUsername(settings.username()); sender.setPassword(settings.appPassword());
        var properties = sender.getJavaMailProperties();
        properties.setProperty("mail.smtp.auth", "true");
        properties.setProperty("mail.smtp.starttls.enable", "true");
        properties.setProperty("mail.smtp.starttls.required", "true");
        properties.setProperty("mail.smtp.ssl.checkserveridentity", "true");
        for (String timeout : new String[] { "connectiontimeout", "timeout", "writetimeout" })
            properties.setProperty("mail.smtp." + timeout, Integer.toString(settings.timeoutMs()));
    }
    @KafkaListener(topics = "identity.branch-email", groupId = "clucky-branch-mail-v1", autoStartup = "${mail-sender.enabled:false}")
    public void receive(String json, Acknowledgment acknowledgment) {
        try {
            EmailMessage message = mapper.readValue(json, EmailMessage.class);
            if (!validator.validate(message).isEmpty() || !"branch-security".equals(message.template())
                    || !message.variables().getOrDefault("otp", "").matches("[0-9]{8}")) throw new IllegalArgumentException();
            Instant expiry = Instant.parse(message.variables().get("expiresAt"));
            transactions.executeWithoutResult(transaction -> {
                jdbc.update("INSERT INTO notification_service.email_logs(message_id,event_id,to_email,subject,template,status) "
                        + "VALUES (?,?,?,'Clucky account security','branch-security','PENDING') ON CONFLICT(message_id) DO NOTHING",
                        message.messageId(), message.eventId(), message.recipient());
                String status = jdbc.queryForObject("SELECT status FROM notification_service.email_logs WHERE message_id=? FOR UPDATE", String.class, message.messageId());
                if ("SENT".equals(status) || "EXPIRED".equals(status)) return;
                if (expiry.isBefore(Instant.now())) {
                    jdbc.update("UPDATE notification_service.email_logs SET status='EXPIRED' WHERE message_id=?", message.messageId());
                    return;
                }
                try {
                    var mail = sender.createMimeMessage();
                    var helper = new MimeMessageHelper(mail, "UTF-8");
                    helper.setFrom(settings.username(), settings.fromName());
                    helper.setTo(message.recipient());
                    helper.setSubject("Clucky — xác minh tài khoản / account verification");
                    helper.setText("Mã xác minh / Verification code: " + message.variables().get("otp")
                            + "\nChallenge: " + message.variables().get("challengeId")
                            + "\nAccount: " + message.variables().get("accountId")
                            + "\nLogin: " + message.variables().get("login") + " / " + message.variables().get("role")
                            + "\nPurpose: " + message.variables().get("purpose")
                            + "\nExpires (UTC): " + expiry
                            + "\nKhông chia sẻ mã. Chỉ dùng cho đúng tài khoản và mục đích hiển thị. / Do not share this code.");
                    sender.send(mail);
                } catch (Exception failure) { throw new IllegalStateException("Branch email delivery pending"); }
                jdbc.update("UPDATE notification_service.email_logs SET status='SENT',sent_at=now() WHERE message_id=?", message.messageId());
            });
            acknowledgment.acknowledge();
        } catch (Exception failure) { throw new IllegalStateException("Branch email delivery pending"); }
    }
}
