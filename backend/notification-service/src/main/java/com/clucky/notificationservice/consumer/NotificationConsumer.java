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
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public NotificationConsumer(
            EventMapper eventMapper,
            NotificationRepository notificationRepository,
            EmailSenderService emailSenderService,
            org.springframework.jdbc.core.JdbcTemplate jdbc
    ) {
        this.eventMapper = eventMapper;
        this.notificationRepository = notificationRepository;
        this.emailSenderService = emailSenderService;
        this.jdbc = jdbc;
    }

    @KafkaListener(
            topics = {
                    "order.created",
                    "order.status-changed",
                    "order.completed",
                    "order.cancelled",
                    "payment.confirmed",
                    "payment.failed",
                    "promotion.approved",
                    "refund.approved",
                    "refund.rejected",
                    "refund.waiting-bank-details",
                    "refund.confirmed",
                    "inventory.low-stock"
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
            LOG.warn("event=kafka_event_malformed topic={} partition={} offset={}",
                    SafeLog.token(topic), record.partition(), record.offset());
            throw new IllegalArgumentException("Invalid notification event");
        }

        String eventId = event.eventId();
        String correlationId = event.correlationId();
        MDC.put("eventId", SafeLog.token(eventId));
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
        if (event.eventType().startsWith("payment.")) {
            if (!"payment-service".equals(event.sourceService()) || orderId == null || orderId <= 0 || customerId == null || customerId <= 0) {
                throw new IllegalArgumentException("Invalid payment notification identity");
            }
            jdbc.update("INSERT INTO notification_service.payment_outcomes(order_id,outcome) VALUES (?,'PENDING') ON CONFLICT DO NOTHING",orderId);
            var outcome=jdbc.queryForMap("SELECT * FROM notification_service.payment_outcomes WHERE order_id=? FOR UPDATE",orderId);
            boolean confirmed="payment.confirmed".equals(event.eventType());
            if (Boolean.TRUE.equals(outcome.get("confirmed")) || !confirmed && Boolean.TRUE.equals(outcome.get("failed"))) return;
            jdbc.update(confirmed ? "UPDATE notification_service.payment_outcomes SET confirmed=true,outcome='CONFIRMED',updated_at=now() WHERE order_id=?"
                    : "UPDATE notification_service.payment_outcomes SET failed=true,outcome='FAILED',updated_at=now() WHERE order_id=?",orderId);
        }
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
                if ("COLLECTION".equals(payload.path("operationType").asText())) {
                    yield new NotificationSpec("Đã ghi nhận thu tại quầy", "Đơn hàng #" + orderCode
                            + " đã được chấp nhận thu tại quầy. Khoản chuyển khai báo có thể còn chờ đối soát ngân hàng.", "PAYMENT", null, vars);
                }
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
            case "refund.approved" -> {
                String title = "Yêu cầu hoàn tiền đã được tiếp nhận";
                String content = "Yêu cầu hoàn tiền cho đơn hàng #" + orderCode + " đã được tiếp nhận xử lý.";
                yield new NotificationSpec(title, content, "REFUND", null, vars);
            }
            case "refund.rejected" -> {
                String reason = payload.hasNonNull("reason") ? payload.get("reason").asText() : "";
                if (!reason.isBlank()) {
                    vars.put("reason", reason);
                }
                String title = "Yêu cầu hoàn tiền bị từ chối";
                String content = "Yêu cầu hoàn tiền cho đơn hàng #" + orderCode + " bị từ chối." + (!reason.isBlank() ? " Lý do: " + reason : "");
                yield new NotificationSpec(title, content, "REFUND", "REFUND_REJECTED", vars);
            }
            case "refund.waiting-bank-details" -> {
                String reason = payload.hasNonNull("reason") ? payload.get("reason").asText() : "";
                if (!reason.isBlank()) {
                    vars.put("reason", reason);
                }
                String title = "Cần cập nhật thông tin nhận hoàn tiền";
                String content = "Chuyển tiền hoàn cho đơn hàng #" + orderCode + " chưa thành công." + (!reason.isBlank() ? " Lý do: " + reason : "") + ". Vui lòng cập nhật lại thông tin tài khoản ngân hàng.";
                yield new NotificationSpec(title, content, "REFUND", "REFUND_WAITING_BANK_DETAILS", vars);
            }
            case "refund.confirmed" -> {
                String title = "Hoàn tiền thành công";
                String amount = vars.get("amount");
                String content = "Số tiền " + (!amount.isBlank() ? amount + "đ " : "") + "cho đơn hàng #" + orderCode + " đã được hoàn tất.";
                yield new NotificationSpec(title, content, "REFUND", "REFUND_CONFIRMED", vars);
            }
            case "inventory.low-stock" -> {
                String productName = payload.hasNonNull("productName") ? payload.get("productName").asText() : "Món ăn";
                int qty = payload.hasNonNull("quantity") ? payload.get("quantity").asInt() : 0;
                int threshold = payload.hasNonNull("threshold") ? payload.get("threshold").asInt() : 20;
                String title = "Cảnh báo tồn kho thấp";
                String content = "Sản phẩm " + productName + " hiện chỉ còn " + qty + " phần (ngưỡng cảnh báo: " + threshold + ").";
                yield new NotificationSpec(title, content, "INVENTORY", null, vars);
            }
            default -> null;
        };
    }

    private Long extractCustomerId(JsonNode payload) {
        if (payload.hasNonNull("managerUserId")) {
            return payload.get("managerUserId").asLong();
        }
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

