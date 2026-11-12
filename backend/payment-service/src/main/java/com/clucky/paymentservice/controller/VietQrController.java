package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.VietQrBankResponse;
import com.clucky.paymentservice.service.VietQrService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class VietQrController {
    private final VietQrService vietQrService;

    public VietQrController(VietQrService vietQrService) {
        this.vietQrService = vietQrService;
    }

    @GetMapping("/banks")
    public ResponseEntity<List<VietQrBankResponse>> banks() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(vietQrService.getBanks());
    }
}
