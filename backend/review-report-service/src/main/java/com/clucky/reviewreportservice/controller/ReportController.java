package com.clucky.reviewreportservice.controller;

import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.config.SecurityContextHelper;
import com.clucky.reviewreportservice.dto.DashboardResponse;
import com.clucky.reviewreportservice.dto.RevenueReportResponse;
import com.clucky.reviewreportservice.service.ReportService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    /**
     * BE-42: GET /api/reports/dashboard
     * Quyền: STF / MGR / ADM; scope theo role
     */
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> getDashboard(
            @RequestParam(required = false) Long storeId,
            HttpServletRequest request
    ) {
        SecurityContextHelper.requireRole(request, "STAFF", "STORE_MANAGER", "ADMIN");
        Long userId = resolveUserId(request);
        String role = resolveUserRole(request);
        Long actorStoreId = resolveStoreId(request);

        DashboardResponse response = reportService.getDashboard(userId, role, actorStoreId, storeId);
        return ResponseEntity.ok(response);
    }

    /**
     * BE-42: GET /api/reports/revenue?storeId=&from=&to=
     * Quyền: MGR (đúng quán), ADM (chọn quán hoặc toàn chuỗi) - STAFF bị chặn
     */
    @GetMapping("/revenue")
    public ResponseEntity<RevenueReportResponse> getRevenueReport(
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request
    ) {
        SecurityContextHelper.requireRole(request, "STORE_MANAGER", "ADMIN");
        Long userId = resolveUserId(request);
        String role = resolveUserRole(request);
        Long actorStoreId = resolveStoreId(request);

        RevenueReportResponse response = reportService.getRevenueReport(userId, role, actorStoreId, storeId, from, to);
        return ResponseEntity.ok(response);
    }

    /**
     * BE-42: GET /api/reports/export?format=xlsx|pdf&storeId=&from=&to=
     * Quyền: MGR (đúng quán), ADM (chọn quán hoặc toàn chuỗi) - STAFF bị chặn
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam String format,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request
    ) throws IOException {
        SecurityContextHelper.requireRole(request, "STORE_MANAGER", "ADMIN");
        Long userId = resolveUserId(request);
        String role = resolveUserRole(request);
        Long actorStoreId = resolveStoreId(request);

        byte[] fileBytes = reportService.exportReport(userId, role, actorStoreId, storeId, from, to, format);

        String normalizedFormat = format.trim().toLowerCase();
        String contentType = normalizedFormat.equals("xlsx")
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : MediaType.APPLICATION_PDF_VALUE;

        String storePart = (storeId != null ? "store" + storeId : "all-stores");
        String filename = String.format("revenue-report-%s-%s-%s.%s",
                storePart,
                from != null ? from.toString() : "start",
                to != null ? to.toString() : LocalDate.now().toString(),
                normalizedFormat);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .contentLength(fileBytes.length)
                .body(fileBytes);
    }

    private Long resolveUserId(HttpServletRequest request) {
        try {
            return SecurityContextHelper.getCurrentUserId(request);
        } catch (Exception e) {
            try {
                return CurrentActor.require().userId();
            } catch (Exception ignored) {
                throw e;
            }
        }
    }

    private String resolveUserRole(HttpServletRequest request) {
        try {
            return SecurityContextHelper.getCurrentUserRole(request);
        } catch (Exception e) {
            try {
                return CurrentActor.require().role().name();
            } catch (Exception ignored) {
                throw e;
            }
        }
    }

    private Long resolveStoreId(HttpServletRequest request) {
        Long sid = SecurityContextHelper.getCurrentStoreId(request);
        if (sid != null) {
            return sid;
        }
        try {
            return CurrentActor.require().storeId();
        } catch (Exception ignored) {
            return null;
        }
    }
}
