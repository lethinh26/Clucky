package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DailyStoreStatsResponse;
import com.clucky.reviewreportservice.dto.DashboardResponse;
import com.clucky.reviewreportservice.dto.RevenueReportResponse;
import com.clucky.reviewreportservice.entity.DailyStoreStats;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.repository.DailyStoreStatsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private final DailyStoreStatsRepository statsRepository;
    private final ReportExportService exportService;

    public ReportService(DailyStoreStatsRepository statsRepository, ReportExportService exportService) {
        this.statsRepository = statsRepository;
        this.exportService = exportService;
    }

    /**
     * BE-42: Lấy dữ liệu Dashboard theo role & scope
     */
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Long actorUserId, String actorRole, Long actorStoreId, Long requestedStoreId) {
        Long effectiveStoreId = resolveEffectiveStoreId(actorRole, actorStoreId, requestedStoreId, true);
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);

        BigDecimal todayRev = BigDecimal.ZERO;
        int todayOrders = 0;
        BigDecimal todayCod = BigDecimal.ZERO;
        BigDecimal todayTransfer = BigDecimal.ZERO;

        BigDecimal periodRev = BigDecimal.ZERO;
        int periodOrders = 0;

        if (effectiveStoreId != null) {
            // Theo cửa hàng cụ thể
            var todayOpt = statsRepository.findByStoreIdAndStatDate(effectiveStoreId, today);
            if (todayOpt.isPresent()) {
                DailyStoreStats s = todayOpt.get();
                todayRev = s.getRevenue();
                todayOrders = s.getOrderCount();
                todayCod = s.getCodAmount();
                todayTransfer = s.getTransferAmount();
            }

            List<DailyStoreStats> monthStats = statsRepository.findByStoreIdAndStatDateBetweenOrderByStatDateAsc(effectiveStoreId, startOfMonth, today);
            for (DailyStoreStats s : monthStats) {
                periodRev = periodRev.add(s.getRevenue());
                periodOrders += s.getOrderCount();
            }
        } else {
            // Toàn chuỗi (Admin)
            List<DailyStoreStats> todayAll = statsRepository.findByStatDateBetweenOrderByStatDateAsc(today, today);
            for (DailyStoreStats s : todayAll) {
                todayRev = todayRev.add(s.getRevenue());
                todayOrders += s.getOrderCount();
                todayCod = todayCod.add(s.getCodAmount());
                todayTransfer = todayTransfer.add(s.getTransferAmount());
            }

            List<DailyStoreStats> monthStats = statsRepository.findByStatDateBetweenOrderByStatDateAsc(startOfMonth, today);
            for (DailyStoreStats s : monthStats) {
                periodRev = periodRev.add(s.getRevenue());
                periodOrders += s.getOrderCount();
            }
        }

        String scope = effectiveStoreId == null ? "CHAIN" : "STORE";
        log.info("Dashboard fetched by {} #{} (scope: {}, store: {})", actorRole, actorUserId, scope, effectiveStoreId);

        return new DashboardResponse(
                scope,
                effectiveStoreId,
                todayRev,
                todayOrders,
                todayCod,
                todayTransfer,
                periodRev,
                periodOrders,
                OffsetDateTime.now()
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
        // Staff bị cấm truy cập báo cáo doanh thu & export
        if ("STAFF".equalsIgnoreCase(actorRole)) {
            throw new ForbiddenException("Nhân viên (Staff) không có quyền truy cập báo cáo doanh thu của cửa hàng!");
        }

        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(30);

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new IllegalArgumentException("Ngày bắt đầu (from) không được lớn hơn ngày kết thúc (to)!");
        }

        Long effectiveStoreId = resolveEffectiveStoreId(actorRole, actorStoreId, requestedStoreId, false);

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

        for (DailyStoreStats s : rawList) {
            totalRevenue = totalRevenue.add(s.getRevenue());
            totalOrders += s.getOrderCount();
            totalCod = totalCod.add(s.getCodAmount());
            totalTransfer = totalTransfer.add(s.getTransferAmount());
        }

        List<DailyStoreStatsResponse> items = rawList.stream()
                .map(s -> new DailyStoreStatsResponse(
                        s.getId(),
                        s.getStoreId(),
                        s.getStatDate(),
                        s.getOrderCount(),
                        s.getRevenue(),
                        s.getCodAmount(),
                        s.getTransferAmount()
                ))
                .toList();

        return new RevenueReportResponse(
                effectiveStoreId,
                effectiveFrom,
                effectiveTo,
                totalRevenue,
                totalOrders,
                totalCod,
                totalTransfer,
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
        if (format == null || (!format.equalsIgnoreCase("xlsx") && !format.equalsIgnoreCase("pdf"))) {
            throw new IllegalArgumentException("Định dạng xuất file không hợp lệ! Chỉ hỗ trợ 'xlsx' hoặc 'pdf'");
        }

        RevenueReportResponse report = getRevenueReport(actorUserId, actorRole, actorStoreId, requestedStoreId, from, to);

        if (format.equalsIgnoreCase("xlsx")) {
            return exportService.exportToExcel(report);
        } else {
            return exportService.exportToPdf(report);
        }
    }

    /**
     * Xác định cửa hàng có hiệu lực và kiểm tra quyền RBAC theo quán
     */
    private Long resolveEffectiveStoreId(String role, Long actorStoreId, Long requestedStoreId, boolean allowStaff) {
        if ("ADMIN".equalsIgnoreCase(role)) {
            return requestedStoreId;
        }

        if ("STORE_MANAGER".equalsIgnoreCase(role) || (allowStaff && "STAFF".equalsIgnoreCase(role))) {
            if (actorStoreId == null) {
                throw new ForbiddenException("Không xác định được cửa hàng của nhân sự!");
            }
            if (requestedStoreId != null && !requestedStoreId.equals(actorStoreId)) {
                throw new ForbiddenException("Bạn không có quyền xem báo cáo của cửa hàng khác!");
            }
            return actorStoreId;
        }

        throw new ForbiddenException("Vai trò không hợp lệ để xem báo cáo!");
    }
}
