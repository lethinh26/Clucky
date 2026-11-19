package com.clucky.notificationservice.service;

import com.clucky.notificationservice.entity.MailTemplate;
import com.clucky.notificationservice.repository.MailTemplateRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MailTemplateManagementService {
    private static final Pattern VARIABLE = Pattern.compile("\\{\\{([A-Za-z0-9_]+)}}");
    // Keep these contracts aligned with NotificationConsumer.resolveNotificationSpec.
    // A variable supplied only for one event must not be published in another template:
    // otherwise the renderer fails the delivery with INVALID_TEMPLATE at runtime.
    private static final Set<String> COMMON = Set.of("orderCode", "customerName");
    private static final Map<String, Set<String>> TRANSACTION_VARIABLES = Map.ofEntries(
            Map.entry("ORDER_CREATED", COMMON),
            Map.entry("ORDER_CONFIRMED", COMMON),
            Map.entry("ORDER_PREPARING", COMMON),
            Map.entry("ORDER_READY", Set.of("orderCode", "customerName", "readyInstruction")),
            Map.entry("ORDER_COMPLETED", COMMON),
            Map.entry("ORDER_CANCELLED", Set.of("orderCode", "customerName", "reason")),
            Map.entry("PAYMENT_CONFIRMED", Set.of("orderCode", "customerName", "amount")),
            Map.entry("PAYMENT_FAILED", Set.of("orderCode", "customerName", "paymentExplanation")),
            Map.entry("REFUND_APPROVED", COMMON),
            Map.entry("REFUND_REJECTED", Set.of("orderCode", "customerName", "reason")),
            Map.entry("REFUND_WAITING_BANK_DETAILS", Set.of("orderCode", "customerName", "reason")),
            Map.entry("REFUND_PROCESSED", Set.of("orderCode", "customerName", "amount")));
    private static final Set<String> BRANCH_VARIABLES = Set.of("channelInstruction", "login", "roleLabel");
    private final JdbcTemplate jdbc;
    private final MailTemplateRepository templates;
    private final EmailTemplateRenderer renderer;

    public MailTemplateManagementService(JdbcTemplate jdbc, MailTemplateRepository templates, EmailTemplateRenderer renderer) {
        this.jdbc = jdbc;
        this.templates = templates;
        this.renderer = renderer;
    }

    public record Summary(String key, String subject, boolean active, Instant updatedAt,
            Long publishedRevisionId, int latestRevision) {}
    public record Revision(long id, int revision, String subject, String text, String html,
            long actorId, Instant createdAt, Instant publishedAt) {}
    public record Detail(Summary template, Revision published, Revision draft, List<Revision> history) {}
    public record Preview(String subject, String text, String html) {}

    @Transactional(readOnly = true)
    public List<Summary> list() {
        return jdbc.query("""
                SELECT t.template_key,t.subject_template,t.is_active,t.updated_at,t.published_revision_id,
                       COALESCE((SELECT max(r.revision_number) FROM notification_service.mail_template_revisions r
                                 WHERE r.template_key=t.template_key),0) AS latest_revision
                FROM notification_service.mail_templates t
                WHERE t.is_active=TRUE ORDER BY t.template_key
                """, (rs, index) -> new Summary(rs.getString("template_key"), rs.getString("subject_template"),
                rs.getBoolean("is_active"), rs.getTimestamp("updated_at").toInstant(),
                rs.getObject("published_revision_id", Long.class), rs.getInt("latest_revision")));
    }

    @Transactional(readOnly = true)
    public Detail get(String key) {
        Summary summary = list().stream().filter(row -> key.equals(row.key())).findFirst().orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown active email template"));
        List<Revision> revisions = jdbc.query("""
                SELECT * FROM notification_service.mail_template_revisions
                WHERE template_key=? ORDER BY revision_number DESC LIMIT 60
                """, (rs, index) -> new Revision(rs.getLong("id"), rs.getInt("revision_number"),
                rs.getString("subject_template"), rs.getString("body_template"), rs.getString("html_template"),
                rs.getLong("created_by"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("published_at") == null ? null : rs.getTimestamp("published_at").toInstant()), key);
        Revision published = revisions.stream().filter(row -> summary.publishedRevisionId() != null
                && summary.publishedRevisionId() == row.id()).findFirst().orElse(null);
        Revision draft = revisions.stream().filter(row -> row.publishedAt() == null
                && (published == null || row.revision() > published.revision())).findFirst().orElse(null);
        return new Detail(summary, published, draft, revisions);
    }

    @Transactional
    public Detail saveDraft(String key, int expectedRevision, String subject, String text, String html, long actorId) {
        lock(key);
        int latest = latest(key);
        if (expectedRevision != latest) throw conflict();
        String cleaned = validate(key, subject, text, html);
        jdbc.update("""
                INSERT INTO notification_service.mail_template_revisions
                (template_key,revision_number,subject_template,body_template,html_template,created_by)
                VALUES (?,?,?,?,?,?)
                """, key, latest + 1, subject.trim(), text.trim(), cleaned, actorId);
        return get(key);
    }

    @Transactional
    public Detail publish(String key, long revisionId, long expectedPublishedRevisionId, long actorId) {
        MailTemplate current = lock(key);
        if (current == null) throw missing();
        var published = jdbc.queryForList("SELECT published_revision_id FROM notification_service.mail_templates WHERE template_key=?", key);
        if (published.isEmpty()) throw missing();
        Object previousId = published.getFirst().get("published_revision_id");
        if (previousId == null || ((Number) previousId).longValue() != expectedPublishedRevisionId) throw conflict();
        Revision revision = requireRevision(key, revisionId);
        if (revision.revision() != latest(key) || revision.publishedAt() != null) throw conflict();
        String cleaned = validate(key, revision.subject(), revision.text(), revision.html());
        // Existing notification_service.configuration_audit trigger records the publishing actor.
        jdbc.queryForObject("SELECT set_config('clucky.actor_id', ?, true)", String.class, String.valueOf(actorId));
        jdbc.update("""
                UPDATE notification_service.mail_templates
                SET subject_template=?,body_template=?,html_template=?,published_revision_id=?,updated_at=now()
                WHERE template_key=? AND is_active=TRUE
                """, revision.subject(), revision.text(), cleaned, revisionId, key);
        jdbc.update("UPDATE notification_service.mail_template_revisions SET published_at=now(),published_by=? WHERE id=?", actorId, revisionId);
        return get(key);
    }

    @Transactional
    public Detail restore(String key, long revisionId, int expectedRevision, long actorId) {
        lock(key);
        if (latest(key) != expectedRevision) throw conflict();
        Revision source = requireRevision(key, revisionId);
        return saveDraft(key, expectedRevision, source.subject(), source.text(), source.html(), actorId);
    }

    @Transactional(readOnly = true)
    public Preview preview(String key, String subject, String text, String html) {
        if (templates.findByTemplateKeyAndIsActiveTrue(key).isEmpty()) throw missing();
        String cleaned = validate(key, subject, text, html);
        Map<String, String> variables = Map.ofEntries(
                Map.entry("customerName", "Nguyễn Văn A"), Map.entry("orderCode", "CL-2026-0012"),
                Map.entry("readyInstruction", "Vui lòng đến quầy nhận món."),
                Map.entry("reason", "Đơn được hủy theo yêu cầu."), Map.entry("amount", "150000"),
                Map.entry("paymentExplanation", "Giao dịch đang được kiểm tra."),
                Map.entry("role", "STORE_MANAGER"), Map.entry("login", "branch.manager"),
                Map.entry("accountId", "101"), Map.entry("challengeId", "00000000-0000-0000-0000-000000000001"),
                Map.entry("otp", key.startsWith("BRANCH_") ? "12345678" : "123456"),
                Map.entry("orderItems", "[]"), Map.entry("orderId", "123"), Map.entry("orderType", "PICKUP"));
        Map<String, String> output = renderer.render(key, subject.trim(), text.trim(), cleaned,
                variables, "preview.primary", Instant.now().plusSeconds(600));
        return new Preview(output.get("subject"), output.get("body"), output.get("html"));
    }

    private MailTemplate lock(String key) {
        var ids = jdbc.queryForList("SELECT id FROM notification_service.mail_templates WHERE template_key=? AND is_active=TRUE FOR UPDATE", key);
        if (ids.isEmpty()) throw missing();
        return templates.findByTemplateKeyAndIsActiveTrue(key).orElseThrow(this::missing);
    }

    private int latest(String key) {
        Integer value = jdbc.queryForObject("""
                SELECT COALESCE(MAX(revision_number),0) FROM notification_service.mail_template_revisions
                WHERE template_key=?
                """, Integer.class, key);
        return value == null ? 0 : value;
    }

    private Revision requireRevision(String key, long revisionId) {
        return jdbc.query("""
                SELECT * FROM notification_service.mail_template_revisions WHERE id=? AND template_key=?
                """, (rs, index) -> new Revision(rs.getLong("id"), rs.getInt("revision_number"),
                rs.getString("subject_template"), rs.getString("body_template"), rs.getString("html_template"),
                rs.getLong("created_by"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("published_at") == null ? null : rs.getTimestamp("published_at").toInstant()),
                revisionId, key).stream().findFirst().orElseThrow(this::missing);
    }

    private static String validate(String key, String subject, String text, String html) {
        if (subject == null || subject.isBlank() || subject.length() > 255 || subject.contains("\r") || subject.contains("\n")
                || text == null || text.isBlank() || text.length() > 100000
                || (html != null && html.length() > 100000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid template size or subject");
        }
        Set<String> allowed = key.startsWith("BRANCH_") ? BRANCH_VARIABLES
                : TRANSACTION_VARIABLES.getOrDefault(key, Set.of());
        for (String value : List.of(subject, text, html == null ? "" : html)) {
            var tokens = VARIABLE.matcher(value);
            while (tokens.find()) {
                if (!allowed.contains(tokens.group(1))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported email variable");
                }
            }
        }
        String cleaned = EmailTemplateRenderer.sanitizeHtml(html);
        if (html != null && (cleaned == null || cleaned.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email HTML body is empty");
        }
        return cleaned;
    }

    private static ResponseStatusException conflict() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Template changed; reload before saving");
    }

    private ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown email template or revision");
    }
}
