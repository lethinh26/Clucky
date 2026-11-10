package com.clucky.paymentservice.dto;

import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;

public record SepayReceipt(long id, String gateway, String accountNumber, String content,
        String transferType, BigDecimal transferAmount, Instant transactionDate, String subAccount,
        String referenceCode, String code) {
    public static SepayReceipt parse(JsonNode body) {
        if (body == null || !body.isObject()) throw invalid();
        JsonNode id = body.get("id");
        JsonNode amount = body.get("transferAmount");
        if (id == null || !id.isIntegralNumber() || !id.canConvertToLong() || id.longValue() <= 0
                || amount == null || !amount.isIntegralNumber() || !amount.canConvertToLong()
                || amount.longValue() <= 0 || amount.longValue() > 999999999999L) throw invalid();
        String direction = text(body, "transferType", 3, false, false);
        String account = text(body, "accountNumber", 80, false, false);
        if (!("in".equals(direction) || "out".equals(direction)) || !account.matches("[0-9]{1,80}")) throw invalid();
        Instant occurred;
        try {
            occurred = LocalDateTime.parse(text(body, "transactionDate", 19, false, false),
                    DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss").withResolverStyle(ResolverStyle.STRICT))
                    .atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        } catch (java.time.DateTimeException failure) { throw invalid(); }
        return new SepayReceipt(id.longValue(), text(body, "gateway", 100, false, false), account,
                text(body, "content", 2000, true, false), direction, BigDecimal.valueOf(amount.longValue()), occurred,
                text(body, "subAccount", 160, true, true), text(body, "referenceCode", 160, true, true),
                text(body, "code", 160, true, true));
    }

    private static String text(JsonNode body, String field, int limit, boolean blank, boolean optional) {
        JsonNode value = body.get(field);
        if (optional && (value == null || value.isNull())) return "";
        if (value == null || !value.isTextual()) throw invalid();
        String text = value.textValue();
        if (text.length() > limit || (!blank && text.isBlank()) || text.indexOf('\0') >= 0) throw invalid();
        return text;
    }

    private static ApiException invalid() { return new ApiException(ErrorCode.VALIDATION_ERROR); }

    @Override
    public String toString() { return "SepayReceipt[redacted]"; }
}
