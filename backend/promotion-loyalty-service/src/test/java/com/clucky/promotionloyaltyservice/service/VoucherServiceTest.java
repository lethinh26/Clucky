package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.ValidateVoucherRequest;
import com.clucky.promotionloyaltyservice.dto.ValidateVoucherResponse;
import com.clucky.promotionloyaltyservice.dto.VoucherRequest;
import com.clucky.promotionloyaltyservice.dto.VoucherResponse;
import com.clucky.promotionloyaltyservice.exception.BadRequestException;
import com.clucky.promotionloyaltyservice.exception.ConflictException;
import com.clucky.promotionloyaltyservice.model.Voucher;
import com.clucky.promotionloyaltyservice.model.VoucherScope;
import com.clucky.promotionloyaltyservice.model.VoucherStatus;
import com.clucky.promotionloyaltyservice.model.VoucherType;
import com.clucky.promotionloyaltyservice.repository.VoucherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoucherServiceTest {

    @Mock
    private VoucherRepository voucherRepository;

    @InjectMocks
    private VoucherService voucherService;

    private Voucher activePercentVoucher;
    private Voucher activeAmountVoucher;
    private Voucher storeVoucher;

    @BeforeEach
    void setUp() {
        Instant now = Instant.now();

        activePercentVoucher = new Voucher();
        activePercentVoucher.setId(1L);
        activePercentVoucher.setCode("CLUCKY15");
        activePercentVoucher.setType(VoucherType.PERCENT);
        activePercentVoucher.setValue(BigDecimal.valueOf(15));
        activePercentVoucher.setMinOrderAmount(BigDecimal.valueOf(100000));
        activePercentVoucher.setMaxDiscount(BigDecimal.valueOf(30000));
        activePercentVoucher.setTotalLimit(100);
        activePercentVoucher.setUsedCount(10);
        activePercentVoucher.setStartAt(now.minus(2, ChronoUnit.DAYS));
        activePercentVoucher.setEndAt(now.plus(10, ChronoUnit.DAYS));
        activePercentVoucher.setScope(VoucherScope.ALL);
        activePercentVoucher.setStatus(VoucherStatus.ACTIVE);

        activeAmountVoucher = new Voucher();
        activeAmountVoucher.setId(2L);
        activeAmountVoucher.setCode("GIAM20K");
        activeAmountVoucher.setType(VoucherType.AMOUNT);
        activeAmountVoucher.setValue(BigDecimal.valueOf(20000));
        activeAmountVoucher.setMinOrderAmount(BigDecimal.valueOf(80000));
        activeAmountVoucher.setTotalLimit(50);
        activeAmountVoucher.setUsedCount(5);
        activeAmountVoucher.setStartAt(now.minus(1, ChronoUnit.DAYS));
        activeAmountVoucher.setEndAt(now.plus(5, ChronoUnit.DAYS));
        activeAmountVoucher.setScope(VoucherScope.ALL);
        activeAmountVoucher.setStatus(VoucherStatus.ACTIVE);

        storeVoucher = new Voucher();
        storeVoucher.setId(3L);
        storeVoucher.setCode("STOREQ1");
        storeVoucher.setType(VoucherType.AMOUNT);
        storeVoucher.setValue(BigDecimal.valueOf(15000));
        storeVoucher.setMinOrderAmount(BigDecimal.valueOf(50000));
        storeVoucher.setStartAt(now.minus(1, ChronoUnit.DAYS));
        storeVoucher.setEndAt(now.plus(5, ChronoUnit.DAYS));
        storeVoucher.setScope(VoucherScope.STORE);
        storeVoucher.setStoreId(1L);
        storeVoucher.setStatus(VoucherStatus.ACTIVE);
    }

    @Test
    void validateVoucher_successfulPercentDiscountCappedByMax() {
        when(voucherRepository.findByCodeIgnoreCase("CLUCKY15")).thenReturn(Optional.of(activePercentVoucher));

        // 15% of 300,000 = 45,000, but capped by maxDiscount = 30,000
        ValidateVoucherRequest req = new ValidateVoucherRequest("CLUCKY15", BigDecimal.valueOf(300000));
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertTrue(resp.isValid());
        assertEquals(BigDecimal.valueOf(30000), resp.getDiscountAmount());
        assertNotNull(resp.getVoucher());
    }

    @Test
    void validateVoucher_successfulAmountDiscount() {
        when(voucherRepository.findByCodeIgnoreCase("GIAM20K")).thenReturn(Optional.of(activeAmountVoucher));

        ValidateVoucherRequest req = new ValidateVoucherRequest("GIAM20K", BigDecimal.valueOf(150000));
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertTrue(resp.isValid());
        assertEquals(BigDecimal.valueOf(20000), resp.getDiscountAmount());
    }

    @Test
    void validateVoucher_notFound_returnsInvalid() {
        when(voucherRepository.findByCodeIgnoreCase("NOTFOUND")).thenReturn(Optional.empty());

        ValidateVoucherRequest req = new ValidateVoucherRequest("NOTFOUND", BigDecimal.valueOf(100000));
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertFalse(resp.isValid());
        assertTrue(resp.getReason().contains("không tồn tại"));
    }

    @Test
    void validateVoucher_expired_returnsInvalid() {
        activePercentVoucher.setEndAt(Instant.now().minus(1, ChronoUnit.HOURS));
        when(voucherRepository.findByCodeIgnoreCase("CLUCKY15")).thenReturn(Optional.of(activePercentVoucher));

        ValidateVoucherRequest req = new ValidateVoucherRequest("CLUCKY15", BigDecimal.valueOf(200000));
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertFalse(resp.isValid());
        assertTrue(resp.getReason().contains("hết hạn"));
    }

    @Test
    void validateVoucher_exhausted_returnsInvalid() {
        activePercentVoucher.setUsedCount(100);
        when(voucherRepository.findByCodeIgnoreCase("CLUCKY15")).thenReturn(Optional.of(activePercentVoucher));

        ValidateVoucherRequest req = new ValidateVoucherRequest("CLUCKY15", BigDecimal.valueOf(200000));
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertFalse(resp.isValid());
        assertTrue(resp.getReason().contains("hết lượt"));
    }

    @Test
    void validateVoucher_belowMinOrder_returnsInvalid() {
        when(voucherRepository.findByCodeIgnoreCase("CLUCKY15")).thenReturn(Optional.of(activePercentVoucher));

        // min order is 100,000, passing 50,000
        ValidateVoucherRequest req = new ValidateVoucherRequest("CLUCKY15", BigDecimal.valueOf(50000));
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertFalse(resp.isValid());
        assertTrue(resp.getReason().contains("chưa đạt mức tối thiểu"));
    }

    @Test
    void validateVoucher_storeScopeMismatch_returnsInvalid() {
        when(voucherRepository.findByCodeIgnoreCase("STOREQ1")).thenReturn(Optional.of(storeVoucher));

        // voucher is for storeId = 1, request is for storeId = 2
        ValidateVoucherRequest req = new ValidateVoucherRequest("STOREQ1", BigDecimal.valueOf(100000), 2L);
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertFalse(resp.isValid());
        assertTrue(resp.getReason().contains("chi nhánh"));
    }

    @Test
    void validateVoucher_storeScopeMatch_returnsValid() {
        when(voucherRepository.findByCodeIgnoreCase("STOREQ1")).thenReturn(Optional.of(storeVoucher));

        ValidateVoucherRequest req = new ValidateVoucherRequest("STOREQ1", BigDecimal.valueOf(100000), 1L);
        ValidateVoucherResponse resp = voucherService.validateVoucher(req);

        assertTrue(resp.isValid());
        assertEquals(BigDecimal.valueOf(15000), resp.getDiscountAmount());
    }

    @Test
    void createVoucher_conflictCode_throwsException() {
        when(voucherRepository.existsByCodeIgnoreCase("CLUCKY15")).thenReturn(true);

        VoucherRequest req = new VoucherRequest();
        req.setCode("CLUCKY15");

        assertThrows(ConflictException.class, () ->
            voucherService.createVoucher(req, 1L, "ADMIN", null)
        );
    }

    @Test
    void createVoucher_endAtBeforeStartAt_throwsException() {
        when(voucherRepository.existsByCodeIgnoreCase("NEWCODE")).thenReturn(false);

        VoucherRequest req = new VoucherRequest();
        req.setCode("NEWCODE");
        req.setStartAt(Instant.now().plus(2, ChronoUnit.DAYS));
        req.setEndAt(Instant.now().plus(1, ChronoUnit.DAYS));

        assertThrows(BadRequestException.class, () ->
            voucherService.createVoucher(req, 1L, "ADMIN", null)
        );
    }

    @Test
    void createVoucher_storeScopeWithoutStoreId_throwsException() {
        when(voucherRepository.existsByCodeIgnoreCase("STORENOID")).thenReturn(false);

        VoucherRequest req = new VoucherRequest();
        req.setCode("STORENOID");
        req.setType(VoucherType.AMOUNT);
        req.setValue(BigDecimal.valueOf(10000));
        req.setStartAt(Instant.now());
        req.setEndAt(Instant.now().plus(5, ChronoUnit.DAYS));
        req.setScope(VoucherScope.STORE);
        req.setStoreId(null);

        assertThrows(BadRequestException.class, () ->
            voucherService.createVoucher(req, 1L, "ADMIN", null)
        );
    }

    @Test
    void createVoucher_validRequest_savesAndReturnsDto() {
        when(voucherRepository.existsByCodeIgnoreCase("SUCCESS10")).thenReturn(false);
        when(voucherRepository.save(any(Voucher.class))).thenAnswer(invocation -> {
            Voucher v = invocation.getArgument(0);
            v.setId(99L);
            return v;
        });

        VoucherRequest req = new VoucherRequest();
        req.setCode("SUCCESS10");
        req.setType(VoucherType.AMOUNT);
        req.setValue(BigDecimal.valueOf(10000));
        req.setStartAt(Instant.now());
        req.setEndAt(Instant.now().plus(5, ChronoUnit.DAYS));
        req.setScope(VoucherScope.ALL);

        VoucherResponse result = voucherService.createVoucher(req, 1L, "ADMIN", null);

        assertNotNull(result);
        assertEquals(99L, result.getId());
        assertEquals("SUCCESS10", result.getCode());
        verify(voucherRepository).save(any(Voucher.class));
    }

    @Test
    void getAvailableVouchers_returnsList() {
        when(voucherRepository.findAvailableVouchers(any(Instant.class), any())).thenReturn(List.of(activePercentVoucher, activeAmountVoucher));

        List<VoucherResponse> list = voucherService.getAvailableVouchers(null);

        assertEquals(2, list.size());
    }
}

