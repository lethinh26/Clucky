package com.clucky.paymentservice.controller;

import com.clucky.paymentservice.dto.VietQrBankResponse;
import com.clucky.paymentservice.service.VietQrService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class VietQrController {
    private final VietQrService vietQrService;

    public VietQrController(VietQrService vietQrService) {
        this.vietQrService = vietQrService;
    }

    @GetMapping("/banks")
    public List<VietQrBankResponse> banks() {
        return vietQrService.getBanks();
    }
}
