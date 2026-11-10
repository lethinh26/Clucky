package com.clucky.paymentservice.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

public final class TransferReference {
    private static final Pattern SHORT_REFERENCE = Pattern.compile("CLUCKY([0-9]{3,19})X([0-9A-F]{8})X");
    private static final Pattern STORE_HEADER = Pattern.compile("CLUCKY([0-9]+)X");
    private TransferReference() {}

    public record Candidate(long paymentId, String orderCode, Long storeId, String reference,
            String accountNumber, String bankName, String bankCode) {}
    public record Match(Candidate candidate, String reason) {}
    public record StoreHint(Long storeId, String reason) {}

    public static String create(long storeId) {
        if (storeId <= 0) throw new IllegalArgumentException("Invalid store ID");
        return "CLUCKY" + String.format(Locale.ROOT, "%03d", storeId) + "X"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT) + "X";
    }

    public static String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    public static Match find(String content, String accountNumber, String gateway, String subAccount, List<Candidate> candidates) {
        String normalized = normalize(content);
        List<Candidate> matches = candidates.stream().filter(candidate -> {
            String reference = normalize(candidate.reference());
            return !reference.isEmpty() && normalized.contains(reference);
        }).limit(2).toList();
        if (matches.isEmpty()) return new Match(null, "REFERENCE_NOT_FOUND");
        if (matches.size() != 1) return new Match(null, "AMBIGUOUS_REFERENCE");
        Candidate candidate = matches.getFirst();
        if (candidate.storeId() == null || candidate.storeId() <= 0 || candidate.accountNumber() == null
                || candidate.orderCode() == null) return new Match(null, "INCOMPLETE_SNAPSHOT");
        if (conflictingStore(normalized, candidate.storeId())) return new Match(null, "STORE_REFERENCE_CONFLICT");
        if (SHORT_REFERENCE.matcher(normalized).results().anyMatch(reference -> !reference.group().equals(normalize(candidate.reference())))) {
            return new Match(null, "AMBIGUOUS_REFERENCE");
        }
        if (!candidate.accountNumber().equals(accountNumber) || normalize(gateway).isEmpty()
                || !(normalize(gateway).equals(normalize(candidate.bankName())) || normalize(gateway).equals(normalize(candidate.bankCode())))) {
            return new Match(null, "BANK_ACCOUNT_MISMATCH");
        }
        if (subAccount != null && !subAccount.isBlank()) return new Match(null, "SUB_ACCOUNT_REVIEW");
        return new Match(candidate, "AWAITING_RECONCILIATION");
    }

    public static StoreHint storeHint(String content, List<Candidate> candidates) {
        String normalized = normalize(content);
        var references = SHORT_REFERENCE.matcher(normalized).results().map(reference -> reference.group()).distinct().toList();
        if (references.isEmpty()) return new StoreHint(null, "REFERENCE_NOT_FOUND");
        if (references.size() != 1) return new StoreHint(null, "AMBIGUOUS_REFERENCE");
        var reference = SHORT_REFERENCE.matcher(references.getFirst());
        if (!reference.matches()) return new StoreHint(null, "REFERENCE_NOT_FOUND");
        long storeId;
        try { storeId = Long.parseLong(reference.group(1)); }
        catch (NumberFormatException failure) { return new StoreHint(null, "INVALID_STORE_REFERENCE"); }
        if (storeId <= 0 || conflictingStore(normalized, storeId)) return new StoreHint(null, "STORE_REFERENCE_CONFLICT");
        for (Candidate candidate : candidates) {
            var known = SHORT_REFERENCE.matcher(normalize(candidate.reference()));
            if (known.matches() && known.group(2).equals(reference.group(2)) && !Long.valueOf(storeId).equals(candidate.storeId())) {
                return new StoreHint(null, "STORE_ORDER_CONFLICT");
            }
        }
        return new StoreHint(storeId, "ORDER_REFERENCE_NOT_FOUND");
    }

    private static boolean conflictingStore(String content, long expectedStore) {
        var headers = STORE_HEADER.matcher(content);
        while (headers.find()) {
            if (!headers.group(1).equals(String.format(Locale.ROOT, "%03d", expectedStore))) return true;
        }
        return false;
    }
}
