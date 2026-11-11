package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.config.SepayWebhookSecurity;
import com.clucky.paymentservice.dto.SepayReceipt;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.clucky.paymentservice.service.SepayReceiptService;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.*;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.*;

@RestController
public class SepayReceiptController {
    private final ObjectMapper mapper;
    private final SepayReceiptService service;

    public SepayReceiptController(ObjectMapper mapper, SepayReceiptService service) {
        this.mapper = mapper;
        this.service = service;
    }

    @PostMapping(value = SepayWebhookSecurity.PATH, consumes = "application/json", produces = "application/json")
    public Map<String, Boolean> receive(HttpServletRequest request) throws IOException {
        byte[] bytes = request.getInputStream().readNBytes(SepayWebhookSecurity.MAX_BODY_BYTES + 1);
        if (bytes.length > SepayWebhookSecurity.MAX_BODY_BYTES) throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        SepayReceipt input;
        try {
            input = SepayReceipt.parse(mapper.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .with(JsonParser.Feature.STRICT_DUPLICATE_DETECTION).readTree(bytes));
        } catch (JsonProcessingException failure) { throw new ApiException(ErrorCode.VALIDATION_ERROR); }
        boolean accepted;
        try { accepted = service.receive(input); }
        catch (DataAccessException | TransactionException failure) { throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE); }
        if (!accepted) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        return Map.of("success", true);
    }

    @GetMapping("/api/payments/transactions")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','STORE_MANAGER')")
    public SepayReceiptService.Inbox list(@RequestParam(required = false) @Size(max = 30) String status,
            @RequestParam(required = false) @Size(max = 160) String search,
            @RequestParam(required = false) @Positive Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "false") boolean conflictsOnly,
            @RequestParam(defaultValue = "false") boolean unclassifiedOnly,
            @RequestParam(required = false) @Size(max = 100) String bank,
            @RequestParam(defaultValue = "0") @Min(0) @Max(1000000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.list(status, search, storeId, from, to, conflictsOnly, page, size, unclassifiedOnly, bank);
    }

    @GetMapping("/api/payments/transactions/{receiptId}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','STORE_MANAGER')")
    public SepayReceiptService.Entry get(@PathVariable @Positive long receiptId) {
        return service.get(receiptId);
    }

    @GetMapping("/api/payments/transactions/{receiptId}/conflicts")
    @PreAuthorize("hasRole('ADMIN')")
    public java.util.List<SepayReceiptService.Conflict> conflicts(@PathVariable @Positive long receiptId,
            @RequestParam(defaultValue="0") @Min(0) @Max(1000000) int page) {
        return service.conflicts(receiptId,page);
    }
}
