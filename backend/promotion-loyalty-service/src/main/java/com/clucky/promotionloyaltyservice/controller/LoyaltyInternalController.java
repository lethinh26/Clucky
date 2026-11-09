package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.dto.LoyaltyData.*;
import com.clucky.promotionloyaltyservice.service.LoyaltyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/loyalty")
public class LoyaltyInternalController {
    private final LoyaltyService loyalty;
    public LoyaltyInternalController(LoyaltyService loyalty) { this.loyalty = loyalty; }
    @PostMapping("/preview")
    public Quote preview(@Valid @RequestBody PreviewInput input) { return loyalty.preview(input); }
    @PostMapping("/reserve")
    public Quote reserve(@Valid @RequestBody ReserveInput input) { return loyalty.reserve(input); }
}
