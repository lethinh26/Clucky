package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.config.CurrentActor;
import com.clucky.promotionloyaltyservice.dto.AdminPointsData.AdjustmentRequest;
import com.clucky.promotionloyaltyservice.dto.AdminPointsData.Overview;
import com.clucky.promotionloyaltyservice.service.AdminPointsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/loyalty/admin/customers")
public class AdminPointsController {
    private final AdminPointsService points;

    public AdminPointsController(AdminPointsService points) {
        this.points = points;
    }

    @GetMapping("/{customerId}/points")
    public Overview get(@PathVariable @Positive long customerId) {
        return points.overview(customerId);
    }

    @PutMapping("/{customerId}/points")
    public Overview adjust(@PathVariable @Positive long customerId,
            @Valid @RequestBody AdjustmentRequest input) {
        return points.adjust(customerId, CurrentActor.require().userId(), input);
    }
}
