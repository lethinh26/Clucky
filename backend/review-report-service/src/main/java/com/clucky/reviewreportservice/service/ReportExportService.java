package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DailyStoreStatsResponse;
import com.clucky.reviewreportservice.dto.RevenueReportResponse;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReportExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DecimalFormat CURRENCY_FMT = new DecimalFormat("#,##0");

    /**
     * Xuất báo cáo doanh thu ra định dạng Excel (.xlsx) với cơ chế chống formula injection
     */
    public byte[] exportToExcel(RevenueReportResponse report) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Bao Cao Doanh Thu");

            // Cell styles
            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle currencyStyle = workbook.createCellStyle();
            DataFormat dataFormat = workbook.createDataFormat();
            currencyStyle.setDataFormat(dataFormat.getFormat("#,##0"));
            currencyStyle.setAlignment(HorizontalAlignment.RIGHT);
            currencyStyle.setBorderBottom(BorderStyle.THIN);
            currencyStyle.setBorderTop(BorderStyle.THIN);
            currencyStyle.setBorderLeft(BorderStyle.THIN);
            currencyStyle.setBorderRight(BorderStyle.THIN);

            CellStyle integerStyle = workbook.createCellStyle();
            integerStyle.setDataFormat(dataFormat.getFormat("#,##0"));
            integerStyle.setAlignment(HorizontalAlignment.RIGHT);
            integerStyle.setBorderBottom(BorderStyle.THIN);
            integerStyle.setBorderTop(BorderStyle.THIN);
            integerStyle.setBorderLeft(BorderStyle.THIN);
            integerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            centerStyle.setBorderBottom(BorderStyle.THIN);
            centerStyle.setBorderTop(BorderStyle.THIN);
            centerStyle.setBorderLeft(BorderStyle.THIN);
            centerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle totalStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font totalFont = workbook.createFont();
            totalFont.setBold(true);
            totalStyle.setFont(totalFont);
            totalStyle.setDataFormat(dataFormat.getFormat("#,##0"));
            totalStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalStyle.setBorderTop(BorderStyle.DOUBLE);
            totalStyle.setBorderBottom(BorderStyle.THIN);
            totalStyle.setBorderLeft(BorderStyle.THIN);
            totalStyle.setBorderRight(BorderStyle.THIN);

            // Title row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("BÁO CÁO DOANH THU (REVENUE REPORT)");
            org.apache.poi.ss.usermodel.Font bigTitleFont = workbook.createFont();
            bigTitleFont.setBold(true);
            bigTitleFont.setFontHeightInPoints((short) 14);
            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(bigTitleFont);
            titleCell.setCellStyle(titleStyle);

            // Subtitle row: Time & Store
            Row subRow = sheet.createRow(1);
            String storeLabel = report.storeId() == null ? "Toàn chuỗi" : "Quán #" + report.storeId();
            String timeLabel = "Kỳ báo cáo: " + report.from().format(DATE_FMT) + " đến " + report.to().format(DATE_FMT) + " | Phạm vi: " + storeLabel;
            subRow.createCell(0).setCellValue(sanitizeText(timeLabel));

            // Blank row
            sheet.createRow(2);

            // Header row (Row 3)
            String[] headers = {"STT", "Ngày", "Mã quán", "Số đơn", "Tiền mặt / COD (VND)", "Chuyển khoản (VND)", "Tổng doanh thu (VND)"};
            Row headerRow = sheet.createRow(3);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowIdx = 4;
            int stt = 1;
            List<DailyStoreStatsResponse> items = report.items();
            for (DailyStoreStatsResponse item : items) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(stt++);
                c0.setCellStyle(centerStyle);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.statDate().format(DATE_FMT));
                c1.setCellStyle(centerStyle);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.storeId());
                c2.setCellStyle(centerStyle);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.orderCount() != null ? item.orderCount() : 0);
                c3.setCellStyle(integerStyle);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.codAmount() != null ? item.codAmount().doubleValue() : 0.0);
                c4.setCellStyle(currencyStyle);

                Cell c5 = row.createCell(5);
                c5.setCellValue(item.transferAmount() != null ? item.transferAmount().doubleValue() : 0.0);
                c5.setCellStyle(currencyStyle);

                Cell c6 = row.createCell(6);
                c6.setCellValue(item.revenue() != null ? item.revenue().doubleValue() : 0.0);
                c6.setCellStyle(currencyStyle);
            }

            // Total row
            Row totalRow = sheet.createRow(rowIdx);
            Cell tLabel = totalRow.createCell(0);
            tLabel.setCellValue("TỔNG CỘNG");
            CellStyle totalLabelStyle = workbook.createCellStyle();
            totalLabelStyle.setFont(totalFont);
            totalLabelStyle.setAlignment(HorizontalAlignment.CENTER);
            totalLabelStyle.setBorderTop(BorderStyle.DOUBLE);
            totalLabelStyle.setBorderBottom(BorderStyle.THIN);
            tLabel.setCellStyle(totalLabelStyle);

            for (int i = 1; i < 3; i++) {
                Cell emptyCell = totalRow.createCell(i);
                emptyCell.setCellStyle(totalLabelStyle);
            }

            Cell tCount = totalRow.createCell(3);
            tCount.setCellValue(report.totalOrderCount() != null ? report.totalOrderCount() : 0);
            tCount.setCellStyle(totalStyle);

            Cell tCod = totalRow.createCell(4);
            tCod.setCellValue(report.totalCodAmount() != null ? report.totalCodAmount().doubleValue() : 0.0);
            tCod.setCellStyle(totalStyle);

            Cell tTransfer = totalRow.createCell(5);
            tTransfer.setCellValue(report.totalTransferAmount() != null ? report.totalTransferAmount().doubleValue() : 0.0);
            tTransfer.setCellStyle(totalStyle);

            Cell tRev = totalRow.createCell(6);
            tRev.setCellValue(report.totalRevenue() != null ? report.totalRevenue().doubleValue() : 0.0);
            tRev.setCellStyle(totalStyle);

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Xuất báo cáo doanh thu ra định dạng PDF chuẩn A4 Landscape
     */
    public byte[] exportToPdf(RevenueReportResponse report) {
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD, Color.BLACK);
            Font subFont = new Font(Font.HELVETICA, 10, Font.ITALIC, Color.DARK_GRAY);
            Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
            Font dataFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.BLACK);
            Font boldFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.BLACK);

            // Title
            Paragraph title = new Paragraph("BAO CAO DOANH THU (REVENUE REPORT)", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4f);
            document.add(title);

            // Subtitle
            String storeLabel = report.storeId() == null ? "Toan chuoi" : "Quan #" + report.storeId();
            String subText = "Ky bao cao: " + report.from().format(DATE_FMT) + " den " + report.to().format(DATE_FMT) + " | Pham vi: " + storeLabel;
            Paragraph subtitle = new Paragraph(subText, subFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(14f);
            document.add(subtitle);

            // Table with 7 columns
            PdfPTable table = new PdfPTable(new float[]{1.5f, 3f, 2.5f, 2.5f, 4f, 4f, 4.5f});
            table.setWidthPercentage(100f);

            String[] headers = {"STT", "Ngay", "Ma quan", "So don", "Tien mat / COD", "Chuyen khoan", "Tong doanh thu"};
            for (String headerText : headers) {
                PdfPCell headerCell = new PdfPCell(new Phrase(headerText, headerFont));
                headerCell.setBackgroundColor(new Color(60, 60, 60));
                headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                headerCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                headerCell.setPadding(6f);
                table.addCell(headerCell);
            }

            int stt = 1;
            for (DailyStoreStatsResponse item : report.items()) {
                addPdfCell(table, String.valueOf(stt++), dataFont, Element.ALIGN_CENTER);
                addPdfCell(table, item.statDate().format(DATE_FMT), dataFont, Element.ALIGN_CENTER);
                addPdfCell(table, String.valueOf(item.storeId()), dataFont, Element.ALIGN_CENTER);
                addPdfCell(table, String.valueOf(item.orderCount() != null ? item.orderCount() : 0), dataFont, Element.ALIGN_RIGHT);
                addPdfCell(table, formatCurrency(item.codAmount()), dataFont, Element.ALIGN_RIGHT);
                addPdfCell(table, formatCurrency(item.transferAmount()), dataFont, Element.ALIGN_RIGHT);
                addPdfCell(table, formatCurrency(item.revenue()), boldFont, Element.ALIGN_RIGHT);
            }

            // Total row
            PdfPCell totalLabelCell = new PdfPCell(new Phrase("TONG CONG", boldFont));
            totalLabelCell.setColspan(3);
            totalLabelCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            totalLabelCell.setBackgroundColor(new Color(235, 235, 235));
            totalLabelCell.setPadding(6f);
            table.addCell(totalLabelCell);

            addPdfCell(table, String.valueOf(report.totalOrderCount() != null ? report.totalOrderCount() : 0), boldFont, Element.ALIGN_RIGHT, new Color(235, 235, 235));
            addPdfCell(table, formatCurrency(report.totalCodAmount()), boldFont, Element.ALIGN_RIGHT, new Color(235, 235, 235));
            addPdfCell(table, formatCurrency(report.totalTransferAmount()), boldFont, Element.ALIGN_RIGHT, new Color(235, 235, 235));
            addPdfCell(table, formatCurrency(report.totalRevenue()), boldFont, Element.ALIGN_RIGHT, new Color(235, 235, 235));

            document.add(table);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi kết xuất báo cáo PDF: " + e.getMessage(), e);
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }

        return out.toByteArray();
    }

    private void addPdfCell(PdfPTable table, String text, Font font, int alignment) {
        addPdfCell(table, text, font, alignment, null);
    }

    private void addPdfCell(PdfPTable table, String text, Font font, int alignment, Color bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(5f);
        if (bgColor != null) {
            cell.setBackgroundColor(bgColor);
        }
        table.addCell(cell);
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) {
            return "0";
        }
        return CURRENCY_FMT.format(amount) + " đ";
    }

    /**
     * Chống CSV/Formula Injection trong Excel nếu nội dung bắt đầu bằng ký tự công thức (=, +, -, @)
     */
    private String sanitizeText(String input) {
        if (input == null || input.isEmpty()) {
            return "";
        }
        char firstChar = input.charAt(0);
        if (firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@') {
            return "'" + input;
        }
        return input;
    }
}
