package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.ValidateVoucherRequest;
import com.clucky.promotionloyaltyservice.dto.ValidateVoucherResponse;
import com.clucky.promotionloyaltyservice.dto.VoucherRequest;
import com.clucky.promotionloyaltyservice.dto.VoucherResponse;
import com.clucky.promotionloyaltyservice.exception.BadRequestException;
import com.clucky.promotionloyaltyservice.exception.ConflictException;
import com.clucky.promotionloyaltyservice.exception.ResourceNotFoundException;
import com.clucky.promotionloyaltyservice.model.Voucher;
import com.clucky.promotionloyaltyservice.model.VoucherScope;
import com.clucky.promotionloyaltyservice.model.VoucherStatus;
import com.clucky.promotionloyaltyservice.model.VoucherType;
import com.clucky.promotionloyaltyservice.repository.VoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class VoucherService {

    private final VoucherRepository voucherRepository;

    public VoucherService(VoucherRepository voucherRepository) {
        this.voucherRepository = voucherRepository;
    }

    /**
     * Validate a voucher for an order amount and optional store.
     */
    @Transactional(readOnly = true)
    public ValidateVoucherResponse validateVoucher(ValidateVoucherRequest request) {
        if (request == null || request.getCode() == null || request.getCode().trim().isEmpty()) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi không được để trống.");
        }

        String cleanCode = request.getCode().trim().toUpperCase();
        Optional<Voucher> optVoucher = voucherRepository.findByCodeIgnoreCase(cleanCode);

        if (optVoucher.isEmpty()) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi '" + cleanCode + "' không tồn tại trong hệ thống.");
        }

        Voucher voucher = optVoucher.get();
        Instant now = Instant.now();

        // 1. Status Check
        if (voucher.getStatus() == VoucherStatus.DISABLED) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi hiện đang tạm khóa.");
        }
        if (voucher.getStatus() == VoucherStatus.PENDING_APPROVAL) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi đang trong trạng thái chờ duyệt.");
        }
        if (voucher.getStatus() == VoucherStatus.REJECTED) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi đã bị từ chối phê duyệt.");
        }
        if (voucher.getStatus() != VoucherStatus.ACTIVE) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi không ở trạng thái khả dụng.");
        }

        // 2. Temporal Check
        if (now.isBefore(voucher.getStartAt())) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi chưa đến thời gian áp dụng.");
        }
        if (now.isAfter(voucher.getEndAt())) {
            return ValidateVoucherResponse.invalid("Mã ưu đãi đã hết hạn sử dụng.");
        }

        // 3. Usage Limits
        if (voucher.getTotalLimit() != null && voucher.getTotalLimit() > 0) {
            int used = voucher.getUsedCount() != null ? voucher.getUsedCount() : 0;
            if (used >= voucher.getTotalLimit()) {
                return ValidateVoucherResponse.invalid("Mã ưu đãi đã hết lượt sử dụng.");
            }
        }

        // 4. Scope and Store validation
        if (voucher.getScope() == VoucherScope.STORE) {
            if (voucher.getStoreId() == null) {
                return ValidateVoucherResponse.invalid("Cấu hình chi nhánh áp dụng của mã không hợp lệ.");
            }
            if (request.getStoreId() == null) {
                return ValidateVoucherResponse.invalid("Mã ưu đãi chỉ áp dụng cho chi nhánh #" + voucher.getStoreId() + ". Vui lòng chọn chi nhánh đặt hàng.");
            }
            if (!voucher.getStoreId().equals(request.getStoreId())) {
                return ValidateVoucherResponse.invalid("Mã ưu đãi chỉ áp dụng tại chi nhánh #" + voucher.getStoreId() + ", không áp dụng cho chi nhánh hiện tại.");
            }
        }

        // 5. Minimum Order Amount
        BigDecimal orderAmount = request.getOrderAmount() != null ? request.getOrderAmount() : BigDecimal.ZERO;
        BigDecimal minOrder = voucher.getMinOrderAmount() != null ? voucher.getMinOrderAmount() : BigDecimal.ZERO;

        if (orderAmount.compareTo(minOrder) < 0) {
            BigDecimal missing = minOrder.subtract(orderAmount);
            return ValidateVoucherResponse.invalid(
                String.format("Đơn hàng chưa đạt mức tối thiểu %sđ (còn thiếu %sđ).",
                    minOrder.toPlainString(), missing.toPlainString())
            );
        }

        // 6. Calculate Discount Amount
        BigDecimal calculatedDiscount = BigDecimal.ZERO;
        if (voucher.getType() == VoucherType.PERCENT) {
            BigDecimal pct = voucher.getValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            calculatedDiscount = orderAmount.multiply(pct).setScale(0, RoundingMode.HALF_UP);

            if (voucher.getMaxDiscount() != null && voucher.getMaxDiscount().compareTo(BigDecimal.ZERO) > 0) {
                if (calculatedDiscount.compareTo(voucher.getMaxDiscount()) > 0) {
                    calculatedDiscount = voucher.getMaxDiscount();
                }
            }
        } else {
            calculatedDiscount = voucher.getValue();
        }

        // Discount cannot exceed total order amount
        if (calculatedDiscount.compareTo(orderAmount) > 0) {
            calculatedDiscount = orderAmount;
        }

        VoucherResponse voucherDto = VoucherResponse.fromEntity(voucher, now);
        return ValidateVoucherResponse.valid(calculatedDiscount, voucherDto);
    }

    /**
     * Get available vouchers for customers.
     */
    @Transactional(readOnly = true)
    public List<VoucherResponse> getAvailableVouchers(Long storeId) {
        Instant now = Instant.now();
        List<Voucher> list = voucherRepository.findAvailableVouchers(now, storeId);
        return list.stream()
            .map(v -> VoucherResponse.fromEntity(v, now))
            .toList();
    }

    /**
     * Query vouchers with optional filters (Admin/Manager).
     */
    @Transactional(readOnly = true)
    public List<VoucherResponse> getVouchers(VoucherScope scope, Long storeId, VoucherStatus status, String keyword) {
        Instant now = Instant.now();
        List<Voucher> list = voucherRepository.findWithFilters(scope, storeId, status, keyword);
        return list.stream()
            .map(v -> VoucherResponse.fromEntity(v, now))
            .toList();
    }

    /**
     * Get voucher details by ID.
     */
    @Transactional(readOnly = true)
    public VoucherResponse getVoucherById(Long id) {
        Voucher v = voucherRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));
        return VoucherResponse.fromEntity(v);
    }

    /**
     * Create a new voucher.
     */
    @Transactional
    public VoucherResponse createVoucher(VoucherRequest request, Long actorId, String actorRole, Long actorStoreId) {
        validateVoucherRequest(request, null);

        // RBAC: Store Manager can only propose/create vouchers for their assigned store
        if ("STORE_MANAGER".equalsIgnoreCase(actorRole)) {
            if (actorStoreId == null) {
                throw new BadRequestException("Store Manager chưa được phân công chi nhánh");
            }
            request.setScope(VoucherScope.STORE);
            request.setStoreId(actorStoreId);
            // By default, manager proposals require Admin approval
            request.setStatus(VoucherStatus.PENDING_APPROVAL);
        }

        Voucher voucher = new Voucher();
        mapDtoToEntity(request, voucher);
        voucher.setCreatedBy(actorId);

        Voucher saved = voucherRepository.save(voucher);
        return VoucherResponse.fromEntity(saved);
    }

    /**
     * Update an existing voucher.
     */
    @Transactional
    public VoucherResponse updateVoucher(Long id, VoucherRequest request, Long actorId, String actorRole, Long actorStoreId) {
        Voucher existing = voucherRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));

        // RBAC check for Store Manager
        if ("STORE_MANAGER".equalsIgnoreCase(actorRole)) {
            if (actorStoreId == null || existing.getStoreId() == null || !existing.getStoreId().equals(actorStoreId)) {
                throw new BadRequestException("Store Manager chỉ được chỉnh sửa voucher thuộc chi nhánh của mình");
            }
            request.setScope(VoucherScope.STORE);
            request.setStoreId(actorStoreId);
        }

        validateVoucherRequest(request, id);
        mapDtoToEntity(request, existing);

        Voucher saved = voucherRepository.save(existing);
        return VoucherResponse.fromEntity(saved);
    }

    /**
     * Delete or disable a voucher.
     */
    @Transactional
    public void deleteVoucher(Long id, Long actorId, String actorRole, Long actorStoreId) {
        Voucher existing = voucherRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));

        if ("STORE_MANAGER".equalsIgnoreCase(actorRole)) {
            if (actorStoreId == null || existing.getStoreId() == null || !existing.getStoreId().equals(actorStoreId)) {
                throw new BadRequestException("Store Manager chỉ được thao tác với voucher thuộc chi nhánh của mình");
            }
        }

        // If voucher was already used in orders, soft delete by disabling
        if (existing.getUsedCount() != null && existing.getUsedCount() > 0) {
            existing.setStatus(VoucherStatus.DISABLED);
            voucherRepository.save(existing);
        } else {
            voucherRepository.delete(existing);
        }
    }

    private void validateVoucherRequest(VoucherRequest request, Long existingId) {
        String cleanCode = request.getCode().trim().toUpperCase();
        request.setCode(cleanCode);

        if (existingId == null) {
            if (voucherRepository.existsByCodeIgnoreCase(cleanCode)) {
                throw new ConflictException("Mã voucher '" + cleanCode + "' đã tồn tại trong hệ thống");
            }
        } else {
            if (voucherRepository.existsByCodeIgnoreCaseAndIdNot(cleanCode, existingId)) {
                throw new ConflictException("Mã voucher '" + cleanCode + "' đã tồn tại trong hệ thống");
            }
        }

        if (request.getEndAt() != null && request.getStartAt() != null) {
            if (!request.getEndAt().isAfter(request.getStartAt())) {
                throw new BadRequestException("Thời gian kết thúc (endAt) phải sau thời gian bắt đầu (startAt)");
            }
        }

        if (request.getType() == VoucherType.PERCENT) {
            if (request.getValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BadRequestException("Mức giảm theo phần trăm không được vượt quá 100%");
            }
        }

        if (request.getScope() == VoucherScope.STORE && request.getStoreId() == null) {
            throw new BadRequestException("Voucher phạm vi chi nhánh (STORE) bắt buộc phải có storeId");
        }
    }

    private void mapDtoToEntity(VoucherRequest dto, Voucher entity) {
        entity.setCode(dto.getCode());
        entity.setTitle(dto.getTitle());
        entity.setDescription(dto.getDescription());
        entity.setType(dto.getType());
        entity.setValue(dto.getValue());
        entity.setMinOrderAmount(dto.getMinOrderAmount() != null ? dto.getMinOrderAmount() : BigDecimal.ZERO);
        entity.setMaxDiscount(dto.getMaxDiscount());
        entity.setTotalLimit(dto.getTotalLimit());
        entity.setStartAt(dto.getStartAt());
        entity.setEndAt(dto.getEndAt());
        entity.setScope(dto.getScope() != null ? dto.getScope() : VoucherScope.ALL);
        entity.setStoreId(entity.getScope() == VoucherScope.STORE ? dto.getStoreId() : null);
        if (dto.getStatus() != null) {
            entity.setStatus(dto.getStatus());
        }
    }
}

