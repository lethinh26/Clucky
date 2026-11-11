package com.clucky.promotionloyaltyservice.controller;

import com.clucky.promotionloyaltyservice.service.VoucherReservationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@org.springframework.validation.annotation.Validated
@RequestMapping("/internal/loyalty")
public class VoucherInternalController {
    private final VoucherReservationService vouchers;
    public VoucherInternalController(VoucherReservationService vouchers) { this.vouchers = vouchers; }

    public record ReservationRequest(@NotNull @Positive Long orderId, @NotNull @Positive Long customerId,
            @NotNull @Positive Long storeId, @NotBlank @Size(max=80) @Pattern(regexp="[A-Za-z0-9_-]+") String code,
            @NotNull @DecimalMin("0") @Digits(integer=12, fraction=0) BigDecimal orderAmount,
            @NotNull @DecimalMin("0") @Digits(integer=12, fraction=0) BigDecimal discountAmount) {}
    public record ReservationResponse(String code, BigDecimal discountAmount) {}

    @PostMapping("/voucher-reservations")
    public ReservationResponse reserve(@Valid @RequestBody ReservationRequest request) {
        vouchers.reserve(request.orderId(), request.customerId(), request.storeId(), request.code(),
                request.orderAmount(), request.discountAmount());
        return new ReservationResponse(request.code().toUpperCase(java.util.Locale.ROOT), request.discountAmount());
    }

    @PostMapping("/voucher-reservations/{orderId}/release")
    public void release(@PathVariable @Positive Long orderId) {
        vouchers.release(orderId);
    }
}
