package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.config.CurrentActor;
import com.clucky.promotionloyaltyservice.dto.LoyaltyData.*;
import com.clucky.promotionloyaltyservice.service.LoyaltyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loyalty")
public class LoyaltyController {
    private final LoyaltyService loyalty;
    public LoyaltyController(LoyaltyService loyalty) { this.loyalty = loyalty; }
    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Overview me(@RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size,
            @RequestParam(defaultValue="ALL") String type) {
        return loyalty.overview(CurrentActor.require().userId(), page, size, type);
    }
    @GetMapping("/policy")
    public Policy policy() { return loyalty.policy(); }
    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public Policy config() { return loyalty.policy(); }
    @PutMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public Policy configure(@Valid @RequestBody PolicyInput input) { return loyalty.configure(input, CurrentActor.require().userId()); }
}
