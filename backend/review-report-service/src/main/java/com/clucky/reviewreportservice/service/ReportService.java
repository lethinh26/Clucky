package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DailyStoreStatsResponse;
import com.clucky.reviewreportservice.dto.DashboardResponse;
import com.clucky.reviewreportservice.dto.RevenueReportResponse;
import com.clucky.reviewreportservice.entity.DailyStoreStats;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.mapper.DomainMapper;
import com.clucky.reviewreportservice.repository.DailyStoreStatsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

@Service
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);
    public static final long MAX_RANGE_DAYS_INCLUSIVE = 366L;

    private final DailyStoreStatsRepository statsRepository;
    private final ReportExportService exportService;
    private final String revenueEventPolicy;

    public ReportService(DailyStoreStatsRepository statsRepository, ReportExportService exportService) {
        this(statsRepository, exportService, "false");
    }

    @Autowired
    public ReportService(
            DailyStoreStatsRepository statsRepository,
            ReportExportService exportService,
            @Value("${clucky.reports.revenue-event:false}") String revenueEventPolicy
    ) {
        this.statsRepository = statsRepository;
        this.exportService = exportService;
        this.revenueEventPolicy = (revenueEventPolicy == null || revenueEventPolicy.isBlank()) ? "false" : revenueEventPolicy.trim();
    }

    /**
     * BE-42: Lấy dữ liệu Dashboard theo role & scope
     */
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Long actorUserId, String actorRole, Long actorStoreId,
                                          Long requestedStoreId, LocalDate from, LocalDate to) {
        Long effectiveStoreId = resolveEffectiveStoreId(actorRole, actorStoreId, requestedStoreId, false);
        LocalDate today = LocalDate.now(ReportProjectionService.VIETNAM_ZONE);

        RevenueReportResponse period = getRevenueReport(
                actorUserId, actorRole, actorStoreId, requestedStoreId, from, to);

        BigDecimal todayRev = BigDecimal.ZERO;
        int todayOrders = 0;
        BigDecimal todayCod = BigDecimal.ZERO;
        BigDecimal todayTransfer = BigDecimal.ZERO;
        BigDecimal todayReconciledTransfer = BigDecimal.ZERO;
        BigDecimal todayPendingReconciliation = BigDecimal.ZERO;
        BigDecimal todayExcess = BigDecimal.ZERO;
        BigDecimal todayExpiredReceipt = BigDecimal.ZERO;
        Instant todayUpdatedAt = null;

        if (effectiveStoreId != null) {
            var todayOpt = statsRepository.findByStoreIdAndStatDate(effectiveStoreId, today);
            if (todayOpt.isPresent()) {
                DailyStoreStats s = todayOpt.get();
                todayRev = amountOrZero(s.getRevenue());
                todayOrders = countOrZero(s.getOrderCount());
                todayCod = amountOrZero(s.getCodAmount());
                todayTransfer = amountOrZero(s.getTransferAmount());
                todayReconciledTransfer = amountOrZero(s.getReconciledTransferAmount());
                todayPendingReconciliation = amountOrZero(s.getPendingReconciliationAmount());
                todayExcess = amountOrZero(s.getExcessAmount());
                todayExpiredReceipt = amountOrZero(s.getExpiredReceiptAmount());
                todayUpdatedAt = s.getUpdatedAt();
            }
        } else {
            List<DailyStoreStats> todayAll = statsRepository.findByStatDateBetweenOrderByStatDateAsc(today, today);
            for (DailyStoreStats s : todayAll) {
                todayRev = todayRev.add(amountOrZero(s.getRevenue()));
                todayOrders += countOrZero(s.getOrderCount());
                todayCod = todayCod.add(amountOrZero(s.getCodAmount()));
                todayTransfer = todayTransfer.add(amountOrZero(s.getTransferAmount()));
                todayReconciledTransfer = todayReconciledTransfer.add(amountOrZero(s.getReconciledTransferAmount()));
                todayPendingReconciliation = todayPendingReconciliation.add(amountOrZero(s.getPendingReconciliationAmount()));
                todayExcess = todayExcess.add(amountOrZero(s.getExcessAmount()));
                todayExpiredReceipt = todayExpiredReceipt.add(amountOrZero(s.getExpiredReceiptAmount()));
                todayUpdatedAt = latestInstant(todayUpdatedAt, s.getUpdatedAt());
            }
        }

        Instant lastUpdatedAt = latestInstant(period.lastUpdatedAt(), todayUpdatedAt);
        String scope = effectiveStoreId == null ? "CHAIN" : "STORE";
        log.info("Dashboard fetched by {} #{} (scope: {}, store: {})", actorRole, actorUserId, scope, effectiveStoreId);

        return new DashboardResponse(
                scope,
                effectiveStoreId,
                period.from(),
                period.to(),
                todayRev,
                todayOrders,
                todayCod,
                todayTransfer,
                period.totalRevenue(),
                period.totalOrderCount(),
                todayReconciledTransfer,
                todayPendingReconciliation,
                todayExcess,
                todayExpiredReceipt,
                period.totalCodAmount(),
                period.totalTransferAmount(),
                period.totalReconciledTransferAmount(),
                period.totalPendingReconciliationAmount(),
                period.totalExcessAmount(),
                period.totalExpiredReceiptAmount(),
                period.projectionActive(),
                period.revenueEventPolicy(),
                lastUpdatedAt,
                OffsetDateTime.now(ReportProjectionService.VIETNAM_ZONE)
        );
    }

    /**
     * BE-42: Lấy dữ liệu Báo cáo Doanh thu theo ngày
     */
    @Transactional(readOnly = true)
    public RevenueReportResponse getRevenueReport(
            Long actorUserId,
            String actorRole,
            Long actorStoreId,
            Long requestedStoreId,
            LocalDate from,
            LocalDate to
    ) {
        // RBAC scope enforced first so unauthorized actors cannot probe date/filter validation
        Long effectiveStoreId = resolveEffectiveStoreId(actorRole, actorStoreId, requestedStoreId, false);

        LocalDate effectiveTo = to != null ? to : LocalDate.now(ReportProjectionService.VIETNAM_ZONE);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.withDayOfMonth(1);

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new IllegalArgumentException("Ngày bắt đầu (from) không được lớn hơn ngày kết thúc (to)!");
        }
        long rangeDays = ChronoUnit.DAYS.between(effectiveFrom, effectiveTo) + 1;
        if (rangeDays > MAX_RANGE_DAYS_INCLUSIVE) {
            throw new IllegalArgumentException("Khoảng thời gian báo cáo tối đa " + MAX_RANGE_DAYS_INCLUSIVE + " ngày!");
        }

        List<DailyStoreStats> rawList;
        if (effectiveStoreId != null) {
            rawList = statsRepository.findByStoreIdAndStatDateBetweenOrderByStatDateAsc(effectiveStoreId, effectiveFrom, effectiveTo);
        } else {
            rawList = statsRepository.findByStatDateBetweenOrderByStatDateAsc(effectiveFrom, effectiveTo);
        }

        BigDecimal totalRevenue = BigDecimal.ZERO;
        int totalOrders = 0;
        BigDecimal totalCod = BigDecimal.ZERO;
        BigDecimal totalTransfer = BigDecimal.ZERO;
        BigDecimal totalReconciledTransfer = BigDecimal.ZERO;
        BigDecimal totalPendingReconciliation = BigDecimal.ZERO;
        BigDecimal totalExcess = BigDecimal.ZERO;
        BigDecimal totalExpiredReceipt = BigDecimal.ZERO;
        Instant lastUpdatedAt = null;

        for (DailyStoreStats s : rawList) {
            totalRevenue = totalRevenue.add(amountOrZero(s.getRevenue()));
            totalOrders += countOrZero(s.getOrderCount());
            totalCod = totalCod.add(amountOrZero(s.getCodAmount()));
            totalTransfer = totalTransfer.add(amountOrZero(s.getTransferAmount()));
            totalReconciledTransfer = totalReconciledTransfer.add(amountOrZero(s.getReconciledTransferAmount()));
            totalPendingReconciliation = totalPendingReconciliation.add(amountOrZero(s.getPendingReconciliationAmount()));
            totalExcess = totalExcess.add(amountOrZero(s.getExcessAmount()));
            totalExpiredReceipt = totalExpiredReceipt.add(amountOrZero(s.getExpiredReceiptAmount()));
            lastUpdatedAt = latestInstant(lastUpdatedAt, s.getUpdatedAt());
        }

        List<DailyStoreStatsResponse> items = rawList.stream()
                .map(DomainMapper::toResponse)
                .toList();

        boolean projectionActive = !"false".equalsIgnoreCase(revenueEventPolicy);

        return new RevenueReportResponse(
                effectiveStoreId,
                effectiveFrom,
                effectiveTo,
                totalRevenue,
                totalOrders,
                totalCod,
                totalTransfer,
                totalReconciledTransfer,
                totalPendingReconciliation,
                totalExcess,
                totalExpiredReceipt,
                projectionActive,
                revenueEventPolicy,
                lastUpdatedAt,
                items
        );
    }

    /**
     * BE-42: Xuất file báo cáo doanh thu (XLSX hoặc PDF)
     */
    @Transactional(readOnly = true)
    public byte[] exportReport(
            Long actorUserId,
            String actorRole,
            Long actorStoreId,
            Long requestedStoreId,
            LocalDate from,
            LocalDate to,
            String format
    ) throws IOException {
        // RBAC scope must fail before format or filter validation
        resolveEffectiveStoreId(actorRole, actorStoreId, requestedStoreId, false);

        String normalizedFormat = format == null ? "" : format.trim().toLowerCase(Locale.ROOT);
        if (!"xlsx".equals(normalizedFormat) && !"pdf".equals(normalizedFormat)) {
            throw new IllegalArgumentException("Định dạng xuất file không hợp lệ! Chỉ hỗ trợ 'xlsx' hoặc 'pdf'");
        }

        RevenueReportResponse report = getRevenueReport(actorUserId, actorRole, actorStoreId, requestedStoreId, from, to);

        if ("xlsx".equals(normalizedFormat)) {
            return exportService.exportToExcel(report);
        }
        return exportService.exportToPdf(report);
    }

    /**
     * Xác định cửa hàng có hiệu lực và kiểm tra quyền RBAC theo quán
     */
    private Long resolveEffectiveStoreId(String role, Long actorStoreId, Long requestedStoreId, boolean allowStaff) {
        if ("STAFF".equalsIgnoreCase(role) && !allowStaff) {
            throw new ForbiddenException("Nhân viên (Staff) không có quyền truy cập báo cáo doanh thu của cửa hàng!");
        }
        if ("ADMIN".equalsIgnoreCase(role)) {
            if (requestedStoreId != null && requestedStoreId <= 0) {
                throw new IllegalArgumentException("storeId phải là số dương!");
            }
            return requestedStoreId;
        }
        if ("STORE_MANAGER".equalsIgnoreCase(role) || (allowStaff && "STAFF".equalsIgnoreCase(role))) {
            if (actorStoreId == null || actorStoreId <= 0) {
                throw new ForbiddenException("Không xác định được cửa hàng của nhân sự!");
            }
            if (requestedStoreId != null && requestedStoreId <= 0) {
                throw new IllegalArgumentException("storeId phải là số dương!");
            }
            if (requestedStoreId != null && !requestedStoreId.equals(actorStoreId)) {
                throw new ForbiddenException("Bạn không có quyền xem báo cáo của cửa hàng khác!");
            }
            return actorStoreId;
        }
        throw new ForbiddenException("Vai trò không hợp lệ để xem báo cáo!");
    }

    private BigDecimal amountOrZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private int countOrZero(Integer value) {
        return value != null ? value : 0;
    }

    private Instant latestInstant(Instant first, Instant second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return second.isAfter(first) ? second : first;
    }
}
