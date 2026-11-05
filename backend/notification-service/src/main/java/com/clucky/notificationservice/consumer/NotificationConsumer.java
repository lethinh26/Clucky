package com.clucky.notificationservice.consumer;

import com.clucky.notificationservice.dto.DomainEvent;
import com.clucky.notificationservice.entity.Notification;
import com.clucky.notificationservice.logging.SafeLog;
import com.clucky.notificationservice.mapper.EventMapper;
import com.clucky.notificationservice.repository.NotificationRepository;
import com.clucky.notificationservice.service.EmailSenderService;
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class NotificationConsumer {
    private static final Logger LOG = LoggerFactory.getLogger(NotificationConsumer.class);

    private final EventMapper eventMapper;
    private final NotificationRepository notificationRepository;
    private final EmailSenderService emailSenderService;

    public NotificationConsumer(
            EventMapper eventMapper,
            NotificationRepository notificationRepository,
            EmailSenderService emailSenderService
    ) {
        this.eventMapper = eventMapper;
        this.notificationRepository = notificationRepository;
        this.emailSenderService = emailSenderService;
    }

    @KafkaListener(
            topics = {
                    "order.created",
                    "order.status-changed",
                    "order.completed",
                    "order.cancelled",
                    "payment.confirmed",
                    "payment.failed",
                    "promotion.approved"
            },
            groupId = "${spring.kafka.consumer.group-id:notification-group}"
    )
    @Transactional
    public void consume(ConsumerRecord<String, String> record, org.springframework.kafka.support.Acknowledgment ack) {
        String topic = record.topic();

        // Check for promotion.approved topic - explicitly deferred per INT-41/58
        if ("promotion.approved".equals(topic)) {
            LOG.info("event=promotion_approved_deferred topic={} partition={} offset={} (deferred per INT-41/58)",
                    topic, record.partition(), record.offset());
            if (ack != null) {
                ack.acknowledge();
            }
            return;
        }

        DomainEvent event;
        try {
            event = eventMapper.fromJson(record.value(), topic);
        } catch (Exception ex) {
            LOG.error("event=kafka_event_malformed topic={} partition={} offset={} error={}",
                    SafeLog.token(topic), record.partition(), record.offset(), ex.getMessage());
            throw new IllegalArgumentException("Invalid notification event");
        }

        String eventId = event.eventId();
        String correlationId = event.correlationId();
        MDC.put("eventId", eventId);
        MDC.put("correlationId", correlationId);

        try {
            processEvent(event);
            if (ack != null) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        ack.acknowledge();
                    }
                });
            }
        } finally {
            MDC.remove("eventId");
            MDC.remove("correlationId");
        }
    }

    private void processEvent(DomainEvent event) {
        JsonNode payload = event.payload();
        if (payload == null || !payload.isObject()) {
            LOG.warn("event=kafka_event_skipped_invalid_payload eventId={} eventType={}",
                    event.eventId(), event.eventType());
            return;
        }

        Long customerId = extractCustomerId(payload);
        Long orderId = extractOrderId(payload);
        String orderCode = extractOrderCode(payload, orderId);
        String recipientEmail = extractRecipientEmail(payload);

        NotificationSpec spec = resolveNotificationSpec(event.eventType(), payload, orderCode);
        if (spec == null) {
            LOG.info("event=notification_no_action_needed eventId={} eventType={}", event.eventId(), event.eventType());
            return;
        }

        // 1. In-App Notification (Idempotent by event + channel + recipient)
        if (customerId != null && spec.inAppTitle() != null) {
            String inAppKey = java.util.UUID.nameUUIDFromBytes(("IN_APP:" + event.eventType() + ":" + event.eventId() + ":" + customerId)
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
            Optional<Notification> existing = notificationRepository.findByOperationKey(inAppKey);
            if (existing.isPresent()) {
                LOG.info("event=notification_in_app_replay_skipped operationKey={}", inAppKey);
            } else {
                Notification notification = new Notification();
                notification.setUserId(customerId);
                notification.setTitle(spec.inAppTitle());
                notification.setContent(spec.inAppContent());
                notification.setType(spec.inAppType());
                notification.setRefId(orderId);
                notification.setIsRead(false);
                notification.setOperationKey(inAppKey);
                notificationRepository.save(notification);

                LOG.info("event=notification_in_app_created userId={} type={} refId={} operationKey={}",
                        customerId, spec.inAppType(), orderId, inAppKey);
            }
        }

        // 2. Email Delivery (Idempotent by messageId = event + channel + recipient)
        if (recipientEmail != null && !recipientEmail.isBlank() && spec.emailTemplate() != null) {
            String emailMessageId = java.util.UUID.nameUUIDFromBytes(("EMAIL:" + event.eventType() + ":" + event.eventId() + ":" + recipientEmail.toLowerCase(java.util.Locale.ROOT).trim())
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
            emailSenderService.processEmailIntent(
                    emailMessageId,
                    event.eventId(),
                    event.correlationId(),
                    recipientEmail.trim(),
                    spec.emailTemplate(),
                    spec.emailVariables()
            );
        }
    }

    private NotificationSpec resolveNotificationSpec(String eventType, JsonNode payload, String orderCode) {
        Map<String, String> vars = new HashMap<>();
        vars.put("orderCode", orderCode);
        vars.put("customerName", extractCustomerName(payload));
        vars.put("amount", extractAmount(payload));

        return switch (eventType) {
            case "order.created" -> {
                String title = "Đơn hàng đã được tạo";
                String content = "Đơn hàng #" + orderCode + " đã được tạo thành công và đang chờ xác nhận.";
                yield new NotificationSpec(title, content, "ORDER", null, vars);
            }
            case "order.status-changed" -> {
                String status = payload.hasNonNull("status") ? payload.get("status").asText() : "CẬP NHẬT";
                String title = "Cập nhật trạng thái đơn hàng";
                String content = "Đơn hàng #" + orderCode + " đã chuyển sang trạng thái " + status + ".";
                String emailTemplate = "CONFIRMED".equalsIgnoreCase(status) ? "ORDER_CONFIRMED" : null;
                yield new NotificationSpec(title, content, "ORDER", emailTemplate, vars);
            }
            case "order.completed" -> {
                String title = "Đơn hàng đã hoàn tất";
                String content = "Đơn hàng #" + orderCode + " đã hoàn tất. Cảm ơn bạn đã lựa chọn Clucky!";
                yield new NotificationSpec(title, content, "ORDER", "ORDER_COMPLETED", vars);
            }
            case "order.cancelled" -> {
                String reason = payload.hasNonNull("reason") ? payload.get("reason").asText() : "";
                if (!reason.isBlank()) {
                    vars.put("reason", reason);
                }
                String title = "Đơn hàng đã bị hủy";
                String content = "Đơn hàng #" + orderCode + " đã bị hủy." + (!reason.isBlank() ? " Lý do: " + reason : "");
                yield new NotificationSpec(title, content, "ORDER", "ORDER_CANCELLED", vars);
            }
            case "payment.confirmed" -> {
                String title = "Thanh toán thành công";
                String amount = vars.get("amount");
                String content = "Thanh toán cho đơn hàng #" + orderCode + " thành công" + (!amount.isBlank() ? " (" + amount + "đ)" : "") + ".";
                yield new NotificationSpec(title, content, "PAYMENT", "PAYMENT_CONFIRMED", vars);
            }
            case "payment.failed" -> {
                String reason = payload.hasNonNull("reason") ? payload.get("reason").asText() : "";
                if (!reason.isBlank()) {
                    vars.put("reason", reason);
                }
                String title = "Thanh toán thất bại";
                String content = "Thanh toán cho đơn hàng #" + orderCode + " thất bại." + (!reason.isBlank() ? " Lý do: " + reason : "");
                yield new NotificationSpec(title, content, "PAYMENT", "PAYMENT_FAILED", vars);
            }
            default -> null;
        };
    }

    private Long extractCustomerId(JsonNode payload) {
        if (payload.hasNonNull("customerId")) {
            return payload.get("customerId").asLong();
        }
        if (payload.hasNonNull("userId")) {
            return payload.get("userId").asLong();
        }
        return null;
    }

    private Long extractOrderId(JsonNode payload) {
        if (payload.hasNonNull("orderId")) {
            return payload.get("orderId").asLong();
        }
        if (payload.hasNonNull("id")) {
            return payload.get("id").asLong();
        }
        return null;
    }

    private String extractOrderCode(JsonNode payload, Long orderId) {
        if (payload.hasNonNull("orderCode")) {
            return payload.get("orderCode").asText();
        }
        return orderId != null ? String.valueOf(orderId) : "N/A";
    }

    private String extractRecipientEmail(JsonNode payload) {
        if (payload.hasNonNull("toEmail")) {
            return payload.get("toEmail").asText();
        }
        if (payload.hasNonNull("customerEmail")) {
            return payload.get("customerEmail").asText();
        }
        if (payload.hasNonNull("receiverEmail")) {
            return payload.get("receiverEmail").asText();
        }
        if (payload.hasNonNull("email")) {
            return payload.get("email").asText();
        }
        return null;
    }

    private String extractCustomerName(JsonNode payload) {
        if (payload.hasNonNull("customerName")) {
            return payload.get("customerName").asText();
        }
        if (payload.hasNonNull("receiverName")) {
            return payload.get("receiverName").asText();
        }
        return "Quý khách";
    }

    private String extractAmount(JsonNode payload) {
        if (payload.hasNonNull("totalAmount")) {
            return payload.get("totalAmount").asText();
        }
        if (payload.hasNonNull("amount")) {
            return payload.get("amount").asText();
        }
        return "";
    }

    private record NotificationSpec(
            String inAppTitle,
            String inAppContent,
            String inAppType,
            String emailTemplate,
            Map<String, String> emailVariables
    ) {}
}

