package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.dto.DailyStoreStatsResponse;
import com.clucky.reviewreportservice.dto.RevenueReportResponse;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.clucky.reviewreportservice.service.ReportExportService;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

class ReportExportServiceTest {

    private final ReportExportService exporter = new ReportExportService();

    @Test
    void exportsValidExcelAndPdfWithVietnameseTextAndReconciliationBreakdown() throws Exception {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 5);
        DailyStoreStatsResponse item = new DailyStoreStatsResponse(
                1L,
                2L,
                LocalDate.of(2026, 11, 5),
                4,
                new BigDecimal("450000"),
                new BigDecimal("200000"),
                new BigDecimal("250000"),
                new BigDecimal("150000"),
                new BigDecimal("100000"),
                new BigDecimal("25000"),
                new BigDecimal("50000"),
                Instant.parse("2026-11-05T10:00:00Z")
        );
        RevenueReportResponse report = new RevenueReportResponse(
                2L,
                from,
                to,
                new BigDecimal("450000"),
                4,
                new BigDecimal("200000"),
                new BigDecimal("250000"),
                new BigDecimal("150000"),
                new BigDecimal("100000"),
                new BigDecimal("25000"),
                new BigDecimal("50000"),
                false,
                "false",
                Instant.parse("2026-11-05T10:00:00Z"),
                List.of(item)
        );

        byte[] xlsxBytes = exporter.exportToExcel(report);
        assertTrue(xlsxBytes.length > 0);
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(xlsxBytes))) {
            var sheet = workbook.getSheetAt(0);
            assertEquals("BÁO CÁO DOANH THU & ĐỐI SOÁT CLUCKY", sheet.getRow(0).getCell(0).getStringCellValue());
            assertEquals(150000d, sheet.getRow(5).getCell(6).getNumericCellValue());
            assertEquals(100000d, sheet.getRow(5).getCell(7).getNumericCellValue());
            assertEquals(25000d, sheet.getRow(5).getCell(8).getNumericCellValue());
            assertEquals(50000d, sheet.getRow(5).getCell(9).getNumericCellValue());
            assertEquals(450000d, sheet.getRow(5).getCell(10).getNumericCellValue());
        }

        byte[] pdfBytes = exporter.exportToPdf(report);
        assertTrue(pdfBytes.length > 100);
        try (PdfReader reader = new PdfReader(pdfBytes)) {
            assertEquals(1, reader.getNumberOfPages());
            String text = new PdfTextExtractor(reader).getTextFromPage(1);
            assertTrue(text.contains("CLUCKY"));
            assertTrue(text.contains("450,000"));
        }
    }

    @Test
    void handlesEmptyPeriodsCleanlyWithoutFailure() throws Exception {
        RevenueReportResponse empty = new RevenueReportResponse(
                null,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 5),
                BigDecimal.ZERO,
                0,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                List.of()
        );
        byte[] xlsx = exporter.exportToExcel(empty);
        byte[] pdf = exporter.exportToPdf(empty);
        assertTrue(xlsx.length > 0);
        assertTrue(pdf.length > 0);
    }

    @Test
    void enforcesExportRowCap() {
        List<DailyStoreStatsResponse> tooMany = IntStream.range(0, ReportExportService.MAX_EXPORT_ROWS + 1)
                .mapToObj(i -> new DailyStoreStatsResponse(
                        (long) i, 1L, LocalDate.of(2026, 11, 1),
                        1, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ZERO))
                .toList();
        RevenueReportResponse oversized = new RevenueReportResponse(
                1L, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5),
                BigDecimal.TEN, tooMany.size(), BigDecimal.TEN, BigDecimal.ZERO, tooMany);
        ApiException ex = assertThrows(ApiException.class, () -> exporter.exportToExcel(oversized));
        assertEquals(ErrorCode.REQUEST_TOO_LARGE, ex.getCode());
    }

    @Test
    void neutralizesFormulaInjectionPayloads() {
        assertEquals("'=SUM(A1:A2)", ReportExportService.sanitizeText("=SUM(A1:A2)"));
        assertEquals("'+cmd|' /C calc'!A0", ReportExportService.sanitizeText("+cmd|' /C calc'!A0"));
        assertEquals("'-2+3", ReportExportService.sanitizeText("-2+3"));
        assertEquals("'@HYPERLINK", ReportExportService.sanitizeText("@HYPERLINK"));
        assertEquals("'\t=1", ReportExportService.sanitizeText("\t=1"));
        assertEquals("'\r=1", ReportExportService.sanitizeText("\r=1"));
        assertEquals("'  =1+1", ReportExportService.sanitizeText("  =1+1"));
        assertEquals("Clucky #2", ReportExportService.sanitizeText("Clucky #2"));
    }
}
