package com.clucky.notificationservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EmailTemplateRenderer {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{([A-Za-z0-9_]+)}}");
    private static final DateTimeFormatter EXPIRY = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    private final String layout;
    private final String customerUrl;
    private final ObjectMapper mapper = new ObjectMapper();

    public EmailTemplateRenderer(@Value("${clucky.frontend.customer-url}") String customerUrl) throws IOException {
        this.customerUrl = origin(customerUrl);
        this.layout = new ClassPathResource("mail/layout.html").getContentAsString(StandardCharsets.UTF_8);
    }

    public static String templateKey(String requested, Map<String, String> variables) {
        if (!"branch-security".equals(requested)) return requested;
        String purpose = variables.getOrDefault("purpose", "");
        if (!Set.of("ACTIVATE", "RESET", "RECOVERY", "ADMIN_RESET", "ADMIN_RECOVERY").contains(purpose)) {
            throw new IllegalArgumentException("Invalid security email purpose");
        }
        return "BRANCH_" + purpose;
    }

    public Map<String, String> render(String key, String subjectTemplate, String bodyTemplate,
            Map<String, String> variables, String messageId, Instant expiresAt) {
        var values = new HashMap<>(variables);
        if (bodyTemplate != null && bodyTemplate.contains("{{amount}}")) {
            values.put("amount", money(values.get("amount")));
        }
        boolean branch = key.startsWith("BRANCH_");
        boolean security = branch || key.endsWith("-otp");
        if (branch) {
            if (!messageId.endsWith(".primary") && !messageId.endsWith(".secondary")) {
                throw new IllegalArgumentException("Invalid security email channel");
            }
            values.put("channelInstruction", messageId.endsWith(".secondary")
                    ? "Đây là mã xác minh gửi tới địa chỉ email khôi phục mới."
                    : "Đây là mã xác nhận gửi tới địa chỉ email đang được dùng để bảo vệ tài khoản.");
        }
        String subject = substitute(subjectTemplate, values);
        String body = substitute(bodyTemplate, values);
        if (subject.length() > 255 || subject.contains("\r") || subject.contains("\n") || body.length() > 100000) {
            throw new IllegalArgumentException("Invalid rendered email");
        }
        var text = new StringBuilder(body);
        var details = new StringBuilder();
        if (security) {
            String otp = values.getOrDefault("otp", "");
            if (!otp.matches(branch ? "[0-9]{8}" : "[0-9]{6}") || expiresAt == null) {
                throw new IllegalArgumentException("Invalid security email");
            }
            String expiry = "Hết hạn lúc " + EXPIRY.format(expiresAt) + " (giờ Việt Nam).";
            text.append("\n\nMã xác minh: ").append(otp).append('\n').append(expiry);
            details.append("""
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #EFE7DB;border-radius:12px;">
                    <tr><td align="center" style="padding:22px 16px 8px;color:#827366;font-size:11px;font-weight:700;letter-spacing:1.8px;line-height:18px;">MÃ XÁC THỰC</td></tr>
                    <tr><td align="center" style="padding:0 8px 12px 14px;"><div class="otp" style="color:#8F1216;font-family:Arial,sans-serif;font-size:38px;font-weight:700;letter-spacing:6px;line-height:48px;">
                    """).append(escape(otp)).append("</div></td></tr>")
                    .append("<tr><td align=\"center\" style=\"padding:0 16px 22px;color:#827366;font-size:12px;line-height:20px;\">")
                    .append(escape(expiry)).append("</td></tr></table>");
            if (branch) {
                for (String field : new String[]{"login", "role", "accountId", "challengeId"}) {
                    String value = values.get(field);
                    if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing account context");
                }
                details.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:20px;\">");
                appendRow(text, details, "Tài khoản", values.get("login"), false);
                appendRow(text, details, "Vai trò", switch (values.get("role")) {
                    case "ADMIN" -> "Quản trị viên";
                    case "STORE_MANAGER" -> "Quản lý chi nhánh";
                    case "STAFF" -> "Nhân viên";
                    default -> throw new IllegalArgumentException("Invalid account role");
                }, false);
                appendRow(text, details, "Mã tài khoản", values.get("accountId"), false);
                appendRow(text, details, "Phiên xác minh", values.get("challengeId"), false);
                details.append("</table>");
            }
        } else {
            String code = values.getOrDefault("orderCode", "");
            String fulfillment = switch (values.getOrDefault("orderType", "")) {
                case "PICKUP" -> "Nhận tại cửa hàng";
                case "DELIVERY" -> "Giao đến địa chỉ trong đơn";
                default -> "";
            };
            text.append("\n\nMã đơn hàng: ").append(code);
            if (!fulfillment.isEmpty()) text.append('\n').append(fulfillment);
            details.append("""
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #EFE7DB;border-radius:12px;">
                    <tr><td style="padding:20px 22px;">
                    <p style="margin:0 0 6px;color:#827366;font-size:11px;font-weight:700;letter-spacing:1.5px;line-height:18px;">MÃ ĐƠN HÀNG</p>
                    <p style="margin:0;color:#8F1216;font-size:20px;font-weight:700;line-height:28px;">
                    """).append(escape(code)).append("</p>");
            if (!fulfillment.isEmpty()) details.append("<p style=\"margin:8px 0 0;color:#74685E;font-size:13px;line-height:21px;\">")
                    .append(escape(fulfillment)).append("</p>");
            details.append("</td></tr></table>");
            if (key.startsWith("ORDER_")) appendOrder(text, details, values);
            String amountLabel = switch (key) {
                case "PAYMENT_CONFIRMED" -> "Đã thanh toán";
                case "REFUND_APPROVED" -> "Số tiền yêu cầu hoàn";
                case "REFUND_PROCESSED" -> "Số tiền đã hoàn";
                default -> "";
            };
            if (!amountLabel.isEmpty()) {
                details.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:20px;\">");
                appendRow(text, details, amountLabel, money(variables.get("amount")), true);
                details.append("</table>");
            }
        }
        String action = "";
        if (!security) {
            String orderId = values.getOrDefault("orderId", "");
            String path = orderId.matches("[1-9][0-9]{0,18}") ? "/orders/" + orderId : "/orders";
            String label = key.startsWith("REFUND_") ? "Xem yêu cầu hoàn tiền" : "Xem chi tiết đơn hàng";
            String url = customerUrl + path;
            text.append("\n\n").append(label).append(": ").append(url);
            action = """
                    <tr><td align="center" style="padding:30px 24px 0;">
                    <table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>
                    <td align="center" bgcolor="#8F1216" style="border-radius:10px;">
                    """ + "<a href=\"" + escape(url) + "\" style=\"display:inline-block;padding:16px 32px;border:1px solid #8F1216;border-radius:10px;color:#FFFFFF;font-size:14px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;\">"
                    + escape(label) + "</a></td></tr></table></td></tr>";
        }
        String notice = security
                ? "Mỗi mã chỉ dùng một lần. Không chia sẻ mã với bất kỳ ai, kể cả người tự nhận là nhân viên Clucky.\nNếu không yêu cầu thao tác này, hãy bỏ qua email và không cung cấp mã."
                : switch (key) {
                    case "ORDER_CANCELLED" -> "Email hủy đơn không phải xác nhận đã hoàn tiền.\nNếu có khoản hoàn, Clucky sẽ cập nhật tiến trình riêng.";
                    case "PAYMENT_FAILED" -> "Nếu tài khoản ngân hàng đã bị trừ tiền,\nkhông chuyển thêm trước khi đối chiếu trạng thái.";
                    case "REFUND_APPROVED" -> "Yêu cầu đang được xử lý.\nĐây chưa phải xác nhận tiền đã về tài khoản.";
                    case "REFUND_REJECTED", "REFUND_WAITING_BANK_DETAILS" -> "Chỉ cập nhật thông tin trong ứng dụng.\nKhông trả lời email bằng số tài khoản, chứng từ hoặc mã OTP.";
                    case "REFUND_PROCESSED" -> "Nếu chưa thấy tiền về, hãy đối chiếu thông tin\ntrong yêu cầu hoàn tiền và với ngân hàng.";
                    default -> "Theo dõi trạng thái và thông tin giao dịch\ntrong trang chi tiết đơn hàng.";
                };
        String footer = (security ? "" : "Đây là thông báo giao dịch, không phải hóa đơn thuế.\n")
                + "Email tự động, vui lòng không trả lời.";
        text.append("\n\n").append(notice).append("\n\nClucky — Crispy outside. Happy inside.\n").append(footer);
        String eyebrow = security ? "register-otp".equals(key) ? "CHÀO MỪNG ĐẾN VỚI CLUCKY" : "BẢO MẬT TÀI KHOẢN"
                : key.startsWith("ORDER_") ? "CẢM ƠN BẠN ĐÃ CHỌN CLUCKY" : "THÔNG TIN GIAO DỊCH";
        String html = substitute(layout, Map.of("subject", escape(subject), "title", escape(heading(key, subject)),
                "eyebrow", eyebrow, "content", lines(body), "details", details.toString(), "action", action,
                "notice", lines(notice), "footer", lines(footer)));
        return Map.of("subject", subject, "body", text.toString(), "html", html);
    }

    private void appendOrder(StringBuilder text, StringBuilder html, Map<String, String> values) {
        com.fasterxml.jackson.databind.JsonNode items;
        try { items = mapper.readTree(values.getOrDefault("orderItems", "[]")); }
        catch (IOException invalid) { throw new IllegalArgumentException("Invalid email order items"); }
        if (items == null || !items.isArray() || items.size() > 30) throw new IllegalArgumentException("Invalid email order items");
        if (!items.isEmpty()) {
            text.append("\n\nMón bạn đã chọn:");
            html.append("""
                    <h2 style="margin:28px 0 16px;color:#16100D;font-size:16px;font-weight:700;line-height:24px;">Món bạn đã chọn</h2>
                    <table width="100%" cellpadding="0" cellspacing="0" aria-label="Chi tiết món ăn" style="table-layout:fixed;font-size:14px;line-height:22px;">
                    <thead><tr><th scope="col" align="left" style="width:60%;padding:0 12px 10px 0;border-bottom:1px solid #EEE9E2;color:#827366;font-size:12px;font-weight:400;">Món ăn</th>
                    <th scope="col" align="right" style="padding:0 0 10px;border-bottom:1px solid #EEE9E2;color:#827366;font-size:12px;font-weight:400;">Thành tiền</th></tr></thead><tbody>
                    """);
            for (var item : items) {
                if (!item.path("itemName").isTextual() || item.path("itemName").asText().length() > 200
                        || !item.path("quantity").isIntegralNumber() || !item.path("quantity").canConvertToInt()
                        || item.path("quantity").intValue() <= 0) throw new IllegalArgumentException("Invalid email order item");
                String name = item.path("itemName").asText();
                String quantity = item.path("quantity").asText();
                String unit = item.hasNonNull("unitPrice") ? quantity + " × " + money(item.path("unitPrice").asText()) : "Số lượng: " + quantity;
                String total = item.hasNonNull("lineTotal") ? money(item.path("lineTotal").asText()) : "Xem chi tiết đơn";
                text.append('\n').append(name).append(" — ").append(unit).append(" — ").append(total);
                html.append("<tr><td style=\"padding:16px 12px 16px 0;border-bottom:1px solid #EEE9E2;vertical-align:top;\"><p style=\"margin:0;color:#16100D;font-weight:700;\">")
                        .append(escape(name)).append("</p><p style=\"margin:4px 0 0;color:#827366;font-size:12px;line-height:20px;\">")
                        .append(escape(unit)).append("</p></td><td align=\"right\" style=\"padding:16px 0;border-bottom:1px solid #EEE9E2;color:#16100D;vertical-align:top;\">")
                        .append(escape(total)).append("</td></tr>");
            }
            html.append("</tbody></table>");
        }
        if ("true".equals(values.get("moreItems"))) {
            text.append("\nCác món còn lại: xem đầy đủ trong chi tiết đơn.");
            html.append("<p style=\"color:#827366;font-size:12px;line-height:20px;\">Các món còn lại: xem đầy đủ trong chi tiết đơn.</p>");
        }
        html.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:12px;\">");
        String[][] totals = {{"subtotal", "Tạm tính"}, {"discountAmount", "Giảm giá"}, {"pointsAmount", "Giảm từ điểm"},
                {"shippingFee", "Phí giao hàng"}, {"totalAmount", "Tổng đơn hàng"}};
        for (var total : totals) {
            String amount = values.get(total[0]);
            if (amount == null) continue;
            String formatted = money(amount);
            boolean reduction = Set.of("discountAmount", "pointsAmount").contains(total[0]);
            if (reduction && new java.math.BigDecimal(amount).signum() == 0) continue;
            appendRow(text, html, total[1], (reduction ? "−" : "") + formatted, "totalAmount".equals(total[0]));
        }
        html.append("</table>");
        String method = switch (values.getOrDefault("paymentMethod", "")) {
            case "COD" -> "Thanh toán khi nhận";
            case "CASH" -> "Tiền mặt";
            case "BANK_TRANSFER" -> "Chuyển khoản ngân hàng";
            case "MIXED" -> "Tiền mặt và chuyển khoản";
            default -> "";
        };
        String status = switch (values.getOrDefault("paymentStatus", "")) {
            case "PAID" -> "Đã thanh toán";
            case "PENDING" -> "Chưa xác nhận thanh toán";
            case "COLLECTED" -> "Đã ghi nhận thu tại quầy; khoản chuyển khai báo có thể còn chờ đối soát";
            case "REFUNDED" -> "Đã ghi nhận hoàn tiền";
            default -> "Xem trạng thái thanh toán trong chi tiết đơn";
        };
        String payment = (method.isEmpty() ? "" : method + " · ") + status;
        text.append('\n').append(payment);
        html.append("<p style=\"margin:8px 0 0;color:#827366;font-size:12px;line-height:20px;\">").append(escape(payment)).append("</p>");
    }

    private static String heading(String key, String fallback) {
        return switch (key) {
            case "register-otp" -> "Xác thực email của bạn";
            case "reset-password-otp", "BRANCH_RESET" -> "Đặt lại mật khẩu";
            case "BRANCH_ACTIVATE" -> "Kích hoạt tài khoản chi nhánh";
            case "BRANCH_RECOVERY" -> "Xác minh email khôi phục";
            case "BRANCH_ADMIN_RESET" -> "Xác nhận đặt lại mật khẩu";
            case "BRANCH_ADMIN_RECOVERY" -> "Xác nhận đổi email khôi phục";
            case "ORDER_CREATED" -> "Clucky đã nhận đơn của bạn";
            case "ORDER_CONFIRMED" -> "Đơn hàng đã được xác nhận";
            case "ORDER_PREPARING" -> "Món ngon đang được chuẩn bị";
            case "ORDER_READY" -> "Món của bạn đã sẵn sàng";
            case "ORDER_COMPLETED" -> "Cảm ơn bạn đã dùng bữa!";
            case "ORDER_CANCELLED" -> "Đơn hàng đã được hủy";
            case "PAYMENT_CONFIRMED" -> "Đã ghi nhận thanh toán";
            case "PAYMENT_FAILED" -> "Thanh toán chưa thành công";
            case "REFUND_APPROVED" -> "Đã tiếp nhận hoàn tiền";
            case "REFUND_REJECTED" -> "Yêu cầu hoàn tiền bị từ chối";
            case "REFUND_WAITING_BANK_DETAILS" -> "Cập nhật thông tin hoàn tiền";
            case "REFUND_PROCESSED" -> "Đã hoàn tất hoàn tiền";
            default -> fallback;
        };
    }

    public static String money(String amount) {
        var number = new java.math.BigDecimal(amount);
        if (number.signum() < 0 || number.precision() > 20 || Math.abs(number.scale()) > 4) {
            throw new IllegalArgumentException("Invalid email amount");
        }
        return java.text.NumberFormat.getCurrencyInstance(java.util.Locale.forLanguageTag("vi-VN")).format(number);
    }

    private static void appendRow(StringBuilder text, StringBuilder html, String label, String value, boolean emphasis) {
        if (value == null || value.isBlank()) return;
        text.append('\n').append(label).append(": ").append(value);
        String style = emphasis ? "padding:16px 0 0;border-top:1px solid #EEE9E2;font-size:15px;font-weight:700;"
                : "padding:8px 0;font-size:13px;";
        html.append("<tr><td style=\"line-height:22px;color:#74685E;vertical-align:top;padding-right:12px;").append(style).append("\">")
                .append(escape(label)).append("</td><td align=\"right\" style=\"line-height:22px;word-break:break-word;").append(style)
                .append(emphasis ? "color:#8F1216;font-size:22px;line-height:28px;" : "color:#51463C;").append("\">")
                .append(escape(value)).append("</td></tr>");
    }

    private static String lines(String text) {
        return escape(text).replace("\r\n", "\n").replace("\n", "<br>");
    }

    private static String escape(String text) { return HtmlUtils.htmlEscape(text, "UTF-8"); }

    private static String substitute(String template, Map<String, String> values) {
        if (template == null) throw new IllegalArgumentException("Missing email template");
        return PLACEHOLDER.matcher(template).replaceAll(match -> {
            String value = values.get(match.group(1));
            if (value == null) throw new IllegalArgumentException("Missing email variable");
            return Matcher.quoteReplacement(value);
        });
    }

    private static String origin(String value) {
        URI uri = URI.create(value);
        if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null || !Set.of("", "/").contains(uri.getPath())) {
            throw new IllegalArgumentException("Configure a frontend origin for email links");
        }
        return value.replaceAll("/+$", "");
    }
}
