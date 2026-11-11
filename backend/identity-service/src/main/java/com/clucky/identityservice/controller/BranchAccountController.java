package com.clucky.identityservice.controller;

import com.clucky.identityservice.dto.BranchAccountData.*;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.service.BranchAccountService;
import com.clucky.identityservice.service.OtpService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
public class BranchAccountController {
    private final BranchAccountService service;
    private final OtpService signatures;
    private final ObjectMapper mapper;
    private final Validator validator;
    public BranchAccountController(BranchAccountService service, OtpService signatures, ObjectMapper mapper, Validator validator) {
        this.service = service; this.signatures = signatures; this.mapper = mapper; this.validator = validator;
    }
    @PostMapping("/branch/challenge")
    public Challenge challenge(@Valid @RequestBody RequestChallenge request) { return service.request(request); }
    @PostMapping("/branch/finish")
    public ResponseEntity<Void> finish(@Valid @RequestBody Finish request) { service.finish(request, false); return ResponseEntity.noContent().build(); }
    @PostMapping("/branch/management/finish")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<Void> finishManagement(@Valid @RequestBody Finish request) { service.finish(request, true); return ResponseEntity.noContent().build(); }
    @GetMapping("/branch/stores/{storeId}")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public Pair pair(@PathVariable long storeId) { return service.get(storeId); }
    @PostMapping("/branch/accounts/{id}/challenge")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public Challenge manage(@PathVariable long id, @Valid @RequestBody Management request) { return service.manage(id, request); }
    @PutMapping("/branch/accounts/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> lock(@PathVariable long id, @RequestParam boolean locked) { service.lockAccount(id, locked); return ResponseEntity.noContent().build(); }

    @GetMapping("/internal/branch-accounts/{storeId}")
    public Pair status(@PathVariable long storeId, @RequestHeader("X-Branch-Time") long timestamp,
            @RequestHeader("X-Branch-Signature") String signature) {
        verify(storeId, timestamp, signature, "");
        return service.internalGet(storeId);
    }

    private void verify(long storeId, long timestamp, String signature, String body) {
        if (body.length() > 8192 || timestamp < Instant.now().getEpochSecond() - 120 || timestamp > Instant.now().getEpochSecond() + 30
                || !MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8),
                    signatures.verifier("branch-provision-v1:" + storeId + ":" + timestamp + ":" + body).getBytes(StandardCharsets.UTF_8)))
            throw new ApiException(ErrorCode.FORBIDDEN);
    }

    @PutMapping("/internal/branch-accounts/{storeId}")
    public Pair provision(@PathVariable long storeId, @RequestHeader("X-Branch-Time") long timestamp,
            @RequestHeader("X-Branch-Signature") String signature, @RequestBody String body) {
        if (body.length() > 8192 || timestamp < Instant.now().getEpochSecond() - 120 || timestamp > Instant.now().getEpochSecond() + 30
                || !MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8),
                    signatures.verifier("branch-provision-v1:" + storeId + ":" + timestamp + ":" + body).getBytes(StandardCharsets.UTF_8)))
            throw new ApiException(ErrorCode.FORBIDDEN);
        Provision request;
        try { request = mapper.readValue(body, Provision.class); } catch (Exception failure) { throw new ApiException(ErrorCode.VALIDATION_ERROR); }
        if (!validator.validate(request).isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        return service.provision(storeId, request);
    }
}
