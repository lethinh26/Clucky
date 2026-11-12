package com.clucky.notificationservice.consumer;

import com.clucky.notificationservice.dto.DomainEvent;
import com.clucky.notificationservice.entity.Notification;
import com.clucky.notificationservice.logging.SafeLog;
import com.clucky.notificationservice.mapper.EventMapper;
import com.clucky.notificationservice.repository.NotificationRepository;
import com.clucky.notificationservice.service.EmailSenderService;
import com.clucky.notificationservice.service.CustomerContactClient;
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
    private final String customerUrl;
    private final CustomerContactClient contacts;

    public NotificationConsumer(
            EventMapper eventMapper,
            NotificationRepository notificationRepository,
            EmailSenderService emailSenderService,
            org.springframework.jdbc.core.JdbcTemplate jdbc,
            @org.springframework.beans.factory.annotation.Value("${clucky.frontend.customer-url}") String customerUrl,
            CustomerContactClient contacts
    ) {
        this.eventMapper = eventMapper;
        this.notificationRepository = notificationRepository;
        this.emailSenderService = emailSenderService;
        this.jdbc = jdbc;
        this.contacts = contacts;
        var origin = java.net.URI.create(customerUrl);
        if (!java.util.Set.of("http", "https").contains(origin.getScheme()) || origin.getHost() == null
                || origin.getUserInfo() != null || origin.getQuery() != null || origin.getFragment() != null) {
            throw new IllegalArgumentException("Configure the customer application URL for notifications");
        }
        this.customerUrl = customerUrl.replaceAll("/+$", "");
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
                    "refund.processed",
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

        boolean refundEvent = event.eventType().startsWith("refund.");
        if (event.eventType().startsWith("order.") && !"cart-order-service".equals(event.sourceService())) {
            throw new IllegalArgumentException("Invalid order notification source");
        }
        if (refundEvent && !"cart-order-service".equals(event.sourceService())
                && !"payment-service".equals(event.sourceService())) {
            throw new IllegalArgumentException("Invalid refund notification source");
        }
        if ("order.created".equals(event.eventType())) {
            recordAdminOrder(event);
        }
        if ("inventory.low-stock".equals(event.eventType())) {
            if (!"catalog-store-service".equals(event.sourceService())) {
                throw new IllegalArgumentException("Invalid inventory notification source");
            }
            recordAdminAlert(event, "INVENTORY", positiveId(payload, "productId"), "Tồn kho thấp",
                    "Chi nhánh có món sắp hết. Kiểm tra tồn kho để điều chỉnh khả năng bán.");
        }
        Long customerId = refundEvent ? refundCustomerId(payload)
                : "inventory.low-stock".equals(event.eventType()) ? extractCustomerId(payload) : positiveId(payload, "customerId");
        Long orderId = extractOrderId(payload);
        if (event.eventType().startsWith("order.") && (customerId == null || positiveId(payload, "orderId") == null)) {
            throw new IllegalArgumentException("Invalid order notification identity");
        }
        if ("refund.processed".equals(event.eventType())
                && (positiveId(payload, "refundId") == null || orderId == null || orderId <= 0
                || positiveId(payload, "storeId") == null || !"REFUNDED".equals(payload.path("status").asText())
                || !payload.path("amount").isNumber() || payload.path("amount").decimalValue().signum() <= 0)) {
            throw new IllegalArgumentException("Invalid processed refund notification");
        }
        if ("refund.processed".equals(event.eventType())) {
            recordAdminAlert(event, "ORDER", orderId, "Đã ghi nhận hoàn tiền", "Đơn hàng #" + orderId + " đã được ghi nhận hoàn tiền.");
        }
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
        String recipientEmail = refundEvent ? refundEmail(payload, customerId) : null;
        if (refundEvent && (customerId == null || recipientEmail == null)) {
            jdbc.update("""
                    INSERT INTO notification_service.notification_delivery_gaps(event_id,event_type,correlation_id,reason)
                    VALUES (?,?,?,?) ON CONFLICT DO NOTHING
                    """, event.eventId(), event.eventType(), event.correlationId(),
                    customerId == null ? "NO_VERIFIED_CUSTOMER_RECIPIENT" : "NO_VERIFIED_CUSTOMER_EMAIL");
        }
        String deliveryKey = "refund.processed".equals(event.eventType())
                ? "refund.processed:" + positiveId(payload, "refundId") : event.eventType() + ":" + event.eventId();

        NotificationSpec spec = resolveNotificationSpec(event.eventType(), payload, orderCode);
        if (spec == null) {
            LOG.info("event=notification_no_action_needed eventId={} eventType={}", event.eventId(), event.eventType());
            return;
        }

        // 1. In-App Notification (Idempotent by event + channel + recipient)
        if (customerId != null && spec.inAppTitle() != null) {
            String inAppKey = java.util.UUID.nameUUIDFromBytes(("IN_APP:" + deliveryKey + ":" + customerId)
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
            Optional<Notification> existing = notificationRepository.findByOperationKey(inAppKey);
            if (existing.isPresent()) {
                LOG.info("event=notification_in_app_replay_skipped operationKey={}", inAppKey);
            } else {
                jdbc.update("""
                        INSERT INTO notification_service.notifications(user_id,title,content,type,ref_id,operation_key)
                        VALUES (?,?,?,?,?,?) ON CONFLICT (operation_key) WHERE operation_key IS NOT NULL DO NOTHING
                        """, customerId, spec.inAppTitle(), spec.inAppContent(), spec.inAppType(), orderId, inAppKey);

                LOG.info("event=notification_in_app_created userId={} type={} refId={} operationKey={}",
                        customerId, spec.inAppType(), orderId, inAppKey);
            }
        }

        if (spec.emailTemplate() != null && customerId != null) {
            String emailMessageId = java.util.UUID.nameUUIDFromBytes(("EMAIL:" + deliveryKey + ":" + customerId)
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
            if (!jdbc.queryForList("SELECT id FROM notification_service.email_logs WHERE message_id=? OR (event_id=? AND template=?)",
                    emailMessageId, event.eventId(), spec.emailTemplate()).isEmpty()) return;
            if (!refundEvent) recipientEmail = contacts.verifiedEmail(customerId);
            if (recipientEmail == null) {
                jdbc.update("INSERT INTO notification_service.notification_delivery_gaps(event_id,event_type,correlation_id,reason) "
                        + "VALUES (?,?,?,'NO_VERIFIED_CUSTOMER_EMAIL') ON CONFLICT DO NOTHING",
                        event.eventId(), event.eventType(), event.correlationId());
                return;
            }
            emailSenderService.processEmailIntent(
                    emailMessageId,
                    event.eventId(),
                    event.correlationId(),
                    recipientEmail.trim(),
                    spec.emailTemplate(),
                    spec.emailVariables(),
                    positiveId(payload, "storeId"),
                    null
            );
        }
    }

    private NotificationSpec resolveNotificationSpec(String eventType, JsonNode payload, String orderCode) {
        Map<String, String> vars = new HashMap<>();
        vars.put("orderCode", orderCode);
        vars.put("customerName", extractCustomerName(payload));
        vars.put("amount", extractAmount(payload));
        Long orderId = positiveId(payload, "orderId");
        if (orderId != null) {
            vars.put("orderId", orderId.toString());
            vars.put("orderUrl", customerUrl + "/orders/" + orderId);
        }
        if (eventType.startsWith("order.")) addOrderVariables(payload, vars);

        return switch (eventType) {
            case "order.created" -> {
                String title = "Đơn hàng đã được tạo";
                String content = "Đơn hàng #" + orderCode + " đã được tạo thành công và đang chờ xác nhận.";
                String status = payload.path("status").asText();
                String template = switch (status) {
                    case "CONFIRMED" -> "ORDER_CONFIRMED";
                    case "PENDING_PAYMENT" -> "ORDER_CREATED";
                    default -> throw new IllegalArgumentException("Invalid initial order state");
                };
                yield new NotificationSpec(title, content, "ORDER", template, vars);
            }
            case "order.status-changed" -> {
                String status = payload.hasNonNull("status") ? payload.get("status").asText() : "CẬP NHẬT";
                String title = "Cập nhật trạng thái đơn hàng";
                String content = "Đơn hàng #" + orderCode + " đã chuyển sang trạng thái " + status + ".";
                String emailTemplate = switch (status) {
                    case "CONFIRMED" -> "ORDER_CONFIRMED";
                    case "PREPARING" -> "ORDER_PREPARING";
                    case "READY" -> "ORDER_READY";
                    default -> null;
                };
                vars.put("readyInstruction", "PICKUP".equals(payload.path("type").asText())
                        ? "Bạn có thể đến cửa hàng nhận món theo thông tin trong đơn."
                        : "Vui lòng theo dõi hướng dẫn nhận món trong chi tiết đơn; trạng thái này chưa xác nhận đã giao hàng.");
                yield new NotificationSpec(title, content, "ORDER", emailTemplate, vars);
            }
            case "order.completed" -> {
                String title = "Đơn hàng đã hoàn tất";
                String content = "Đơn hàng #" + orderCode + " đã hoàn tất. Cảm ơn bạn đã lựa chọn Clucky!";
                yield new NotificationSpec(title, content, "ORDER", "ORDER_COMPLETED", vars);
            }
            case "order.cancelled" -> {
                String reason = payload.hasNonNull("reason") ? payload.get("reason").asText() : "";
                vars.put("reason", reason.isBlank() ? "Vui lòng xem chi tiết trong ứng dụng" : reason);
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
                vars.put("paymentExplanation", "Vui lòng xem trạng thái giao dịch và hướng dẫn trong ứng dụng. "
                        + "Clucky chỉ xác nhận thanh toán sau khi đối chiếu thành công.");
                String title = "Thanh toán thất bại";
                String content = "Thanh toán cho đơn hàng #" + orderCode + " thất bại." + (!reason.isBlank() ? " Lý do: " + reason : "");
                yield new NotificationSpec(title, content, "PAYMENT", "PAYMENT_FAILED", vars);
            }
            case "refund.approved" -> {
                String title = "Yêu cầu hoàn tiền đã được tiếp nhận";
                String content = "Yêu cầu hoàn tiền cho đơn hàng #" + orderCode + " đã được tiếp nhận xử lý.";
                yield new NotificationSpec(title, content, "REFUND", "REFUND_APPROVED", vars);
            }
            case "refund.rejected" -> {
                String reason = payload.hasNonNull("reason") ? payload.get("reason").asText() : "";
                vars.put("reason", reason.isBlank() ? "Vui lòng xem chi tiết trong ứng dụng" : reason);
                String title = "Yêu cầu hoàn tiền bị từ chối";
                String content = "Yêu cầu hoàn tiền cho đơn hàng #" + orderCode + " bị từ chối." + (!reason.isBlank() ? " Lý do: " + reason : "");
                yield new NotificationSpec(title, content, "REFUND", "REFUND_REJECTED", vars);
            }
            case "refund.waiting-bank-details" -> {
                String reason = payload.hasNonNull("reason") ? payload.get("reason").asText() : "";
                vars.put("reason", reason.isBlank() ? "Vui lòng kiểm tra thông tin nhận tiền" : reason);
                String title = "Cần cập nhật thông tin nhận hoàn tiền";
                String content = "Chuyển tiền hoàn cho đơn hàng #" + orderCode + " chưa thành công." + (!reason.isBlank() ? " Lý do: " + reason : "") + ". Vui lòng cập nhật lại thông tin tài khoản ngân hàng.";
                yield new NotificationSpec(title, content, "REFUND", "REFUND_WAITING_BANK_DETAILS", vars);
            }
            case "refund.confirmed", "refund.processed" -> {
                String title = "Hoàn tiền thành công";
                String amount = vars.get("amount");
                String content = "Số tiền " + (!amount.isBlank() ? amount + "đ " : "") + "cho đơn hàng #" + orderCode + " đã được hoàn tất.";
                yield new NotificationSpec(title, content, "REFUND", "REFUND_PROCESSED", vars);
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

    private void recordAdminOrder(DomainEvent event) {
        JsonNode payload = event.payload();
        Long orderId = positiveId(payload, "orderId");
        Long storeId = positiveId(payload, "storeId");
        if (!"cart-order-service".equals(event.sourceService()) || orderId == null || storeId == null) {
            throw new IllegalArgumentException("Invalid admin order notification");
        }
        jdbc.update("""
                INSERT INTO notification_service.admin_notifications
                    (operation_key,event_id,correlation_id,title,content,type,ref_id,store_id)
                VALUES (?,?,?,'Đơn hàng mới',?,'ORDER',?,?) ON CONFLICT (operation_key) DO NOTHING
                """, "order.created:" + orderId, event.eventId(), event.correlationId(),
                "Đơn hàng #" + orderId + " vừa được tạo tại chi nhánh #" + storeId + ".", orderId, storeId);
    }

    private Long positiveId(JsonNode payload, String field) {
        JsonNode value = payload.path(field);
        return value.isIntegralNumber() && value.canConvertToLong() && value.longValue() > 0 ? value.longValue() : null;
    }

    private void recordAdminAlert(DomainEvent event, String type, Long reference, String title, String content) {
        Long storeId = positiveId(event.payload(), "storeId");
        if (reference == null || storeId == null) throw new IllegalArgumentException("Invalid admin notification reference");
        jdbc.update("INSERT INTO notification_service.admin_notifications "
                + "(operation_key,event_id,correlation_id,title,content,type,ref_id,store_id) VALUES (?,?,?,?,?,?,?,?) "
                + "ON CONFLICT(operation_key) DO NOTHING", "admin:" + event.eventId(), event.eventId(), event.correlationId(),
                title, content, type, reference, storeId);
    }

    private Long refundCustomerId(JsonNode payload) {
        Long customerId = positiveId(payload, "customerId");
        JsonNode recipient = payload.path("recipient");
        return customerId != null && customerId.equals(positiveId(recipient, "userId"))
                && "CUSTOMER".equals(recipient.path("role").asText()) ? customerId : null;
    }

    private String refundEmail(JsonNode payload, Long customerId) {
        JsonNode recipient = payload.path("recipient");
        if (customerId == null || !recipient.path("emailVerified").isBoolean()
                || !recipient.path("emailVerified").booleanValue() || !recipient.path("email").isTextual()) return null;
        String email = recipient.path("email").textValue().trim();
        if (email.isBlank() || email.length() > 255 || email.contains("\r") || email.contains("\n")) return null;
        try {
            var address = new jakarta.mail.internet.InternetAddress(email, true);
            address.validate();
            return email.equals(address.getAddress()) && address.getPersonal() == null ? email : null;
        } catch (jakarta.mail.internet.AddressException failure) {
            return null;
        }
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

    private void addOrderVariables(JsonNode payload, Map<String, String> variables) {
        var displayedItems = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.arrayNode();
        var items = payload.path("items");
        if (items.isArray()) {
            int encodedLength = 2;
            for (JsonNode item : items) {
                String name = item.path("itemName").asText("Món ăn");
                if (name.length() > 200) name = name.substring(0, 200);
                var displayed = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode().put("itemName", name);
                for (String field : new String[]{"quantity", "unitPrice", "lineTotal"}) {
                    if (item.path(field).isNumber()) displayed.set(field, item.get(field));
                }
                encodedLength += displayed.toString().length() + 1;
                if (displayedItems.size() == 30 || encodedLength > 8500) break;
                displayedItems.add(displayed);
            }
            variables.put("moreItems", Boolean.toString(displayedItems.size() < items.size()));
        }
        variables.put("orderItems", displayedItems.toString());
        for (String field : new String[]{"subtotal", "discountAmount", "pointsAmount", "shippingFee", "totalAmount"}) {
            if (payload.path(field).isNumber()) variables.put(field, payload.path(field).asText());
        }
        variables.put("orderType", payload.path("type").asText());
        variables.put("paymentMethod", payload.path("paymentMethod").asText());
        variables.put("paymentStatus", payload.path("paymentStatus").asText());
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

