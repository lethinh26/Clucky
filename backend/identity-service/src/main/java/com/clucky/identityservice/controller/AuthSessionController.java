package com.clucky.identityservice.controller;

import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.service.AuthSessionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
public class AuthSessionController {
    private final AuthSessionService service;

    public AuthSessionController(AuthSessionService service) { this.service = service; }

    public record SessionLimit(@Min(1) @Max(10) int limit) {}

    private String sid(Jwt jwt) {
        String value = jwt.getClaimAsString("sid");
        if (value == null || value.isBlank()) throw new ApiException(ErrorCode.UNAUTHENTICATED);
        return value;
    }

    private CurrentActor activeActor(Jwt jwt) {
        CurrentActor actor = CurrentActor.require();
        // Old access tokens without a durable ledger cannot use management APIs during cutover.
        if (!service.isActive(actor.userId(), sid(jwt))) throw new ApiException(ErrorCode.TOKEN_REVOKED);
        return actor;
    }

    @GetMapping("/sessions")
    public AuthSessionService.Overview own(@AuthenticationPrincipal Jwt jwt) {
        CurrentActor actor = activeActor(jwt);
        return service.list(actor, actor.userId(), sid(jwt));
    }

    @PatchMapping("/sessions/limit")
    public AuthSessionService.Overview ownLimit(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SessionLimit request) {
        CurrentActor actor = activeActor(jwt);
        return service.setLimit(actor, actor.userId(), request.limit(), sid(jwt));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeOwn(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String sessionId) {
        CurrentActor actor = activeActor(jwt);
        service.revokeOne(actor, actor.userId(), sessionId, sid(jwt));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions/revoke-others")
    public ResponseEntity<Void> revokeOthers(@AuthenticationPrincipal Jwt jwt) {
        CurrentActor actor = activeActor(jwt);
        service.revokeOthers(actor, actor.userId(), sid(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/branch/accounts/{accountId}/sessions")
    public AuthSessionService.Overview branch(@AuthenticationPrincipal Jwt jwt,
            @PathVariable long accountId) {
        return service.list(activeActor(jwt), accountId, sid(jwt));
    }

    @PatchMapping("/branch/accounts/{accountId}/sessions/limit")
    public AuthSessionService.Overview branchLimit(@AuthenticationPrincipal Jwt jwt,
            @PathVariable long accountId, @Valid @RequestBody SessionLimit request) {
        return service.setLimit(activeActor(jwt), accountId, request.limit(), sid(jwt));
    }

    @DeleteMapping("/branch/accounts/{accountId}/sessions/{sessionId}")
    public ResponseEntity<Void> revokeBranch(@AuthenticationPrincipal Jwt jwt,
            @PathVariable long accountId, @PathVariable String sessionId) {
        service.revokeOne(activeActor(jwt), accountId, sessionId, sid(jwt));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/branch/accounts/{accountId}/sessions/revoke-all")
    public ResponseEntity<Void> revokeBranchAll(@AuthenticationPrincipal Jwt jwt,
            @PathVariable long accountId) {
        service.revokeAllManaged(activeActor(jwt), accountId, sid(jwt));
        return ResponseEntity.noContent().build();
    }
}
