package com.clucky.reviewreportservice.controller;

import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.dto.DashboardResponse;
import com.clucky.reviewreportservice.dto.RevenueReportResponse;
import com.clucky.reviewreportservice.dto.Role;
import com.clucky.reviewreportservice.service.ReportProjectionService;
import com.clucky.reviewreportservice.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
     * Quyền: MGR / ADM; scope theo role
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<DashboardResponse> getDashboard(
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        CurrentActor actor = CurrentActor.require();

        DashboardResponse response = reportService.getDashboard(
                actor.userId(), actor.role().name(), actor.storeId(), storeId, from, to);
        return ResponseEntity.ok(response);
    }

    /**
     * BE-42: GET /api/reports/revenue?storeId=&from=&to=
     * Quyền: MGR (đúng quán), ADM (chọn quán hoặc toàn chuỗi) - STAFF bị chặn
     */
    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<RevenueReportResponse> getRevenueReport(
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        CurrentActor actor = CurrentActor.require();

        RevenueReportResponse response = reportService.getRevenueReport(
                actor.userId(), actor.role().name(), actor.storeId(), storeId, from, to);
        return ResponseEntity.ok(response);
    }

    /**
     * BE-42: GET /api/reports/export?format=xlsx|pdf&storeId=&from=&to=
     * Quyền: MGR (đúng quán), ADM (chọn quán hoặc toàn chuỗi) - STAFF bị chặn
     */
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam String format,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) throws IOException {
        CurrentActor actor = CurrentActor.require();
        LocalDate effectiveTo = to != null ? to : LocalDate.now(ReportProjectionService.VIETNAM_ZONE);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.withDayOfMonth(1);

        byte[] fileBytes = reportService.exportReport(actor.userId(), actor.role().name(), actor.storeId(),
                storeId, effectiveFrom, effectiveTo, format);

        String trimmedFormat = format != null ? format.trim() : "";
        String normalizedFormat = "xlsx".equalsIgnoreCase(trimmedFormat) ? "xlsx" : "pdf";
        String contentType = normalizedFormat.equals("xlsx")
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : MediaType.APPLICATION_PDF_VALUE;

        Long effectiveStoreId = actor.role() == Role.ADMIN ? storeId : actor.storeId();
        String storePart = (effectiveStoreId != null ? "store" + effectiveStoreId : "all-stores");
        String filename = String.format("revenue-report-%s-%s-%s.%s",
                storePart,
                effectiveFrom,
                effectiveTo,
                normalizedFormat);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .contentLength(fileBytes.length)
                .body(fileBytes);
    }
}
