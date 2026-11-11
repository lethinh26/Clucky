package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DailyStoreStatsResponse;
import com.clucky.reviewreportservice.dto.RevenueReportResponse;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
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
import org.librepdf.openpdf.fonts.Liberation;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
public class ReportExportService {

    public static final int MAX_EXPORT_ROWS = 10_000;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIMESTAMP_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ReportProjectionService.VIETNAM_ZONE);
    private static final DecimalFormat CURRENCY_FMT = createCurrencyFormat();

    private static final String[] HEADERS = {
            "STT",
            "Ngày",
            "Mã quán",
            "Số đơn",
            "Tiền mặt / COD (VND)",
            "Tổng CK ghi nhận (VND)",
            "CK đã đối soát NH (VND)",
            "CK chờ đối soát (VND)",
            "Tiền dư (KTDT)",
            "Nhận sau hết hạn (KTDT)",
            "Doanh thu ghi nhận (VND)"
    };

    private static final Color CLUCKY_DARK = new Color(0x16, 0x10, 0x0D);
    private static final Color CLUCKY_BURGUNDY = new Color(0x8F, 0x12, 0x16);
    private static final Color CLUCKY_CREAM = new Color(0xF5, 0xED, 0xE0);
    private static final Color CLUCKY_MUTED = new Color(0x6B, 0x62, 0x59);
    private static final Color CLUCKY_BORDER = new Color(0xD6, 0xC9, 0xB9);

    private static DecimalFormat createCurrencyFormat() {
        DecimalFormatSymbols symbols = DecimalFormatSymbols.getInstance(Locale.US);
        return new DecimalFormat("#,##0", symbols);
    }

    /**
     * Xuất báo cáo doanh thu ra định dạng Excel (.xlsx) với cơ chế chống formula injection
     * và không phụ thuộc thư viện font AWT của hệ điều hành container.
     */
    public byte[] exportToExcel(RevenueReportResponse report) throws IOException {
        List<DailyStoreStatsResponse> items = report.items() != null ? report.items() : List.of();
        if (items.size() > MAX_EXPORT_ROWS) {
            throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Bao Cao Doanh Thu");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setWrapText(true);
            applyThinBorders(headerStyle);

            DataFormat dataFormat = workbook.createDataFormat();

            CellStyle currencyStyle = workbook.createCellStyle();
            currencyStyle.setDataFormat(dataFormat.getFormat("#,##0"));
            currencyStyle.setAlignment(HorizontalAlignment.RIGHT);
            applyThinBorders(currencyStyle);

            CellStyle integerStyle = workbook.createCellStyle();
            integerStyle.setDataFormat(dataFormat.getFormat("#,##0"));
            integerStyle.setAlignment(HorizontalAlignment.RIGHT);
            applyThinBorders(integerStyle);

            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            applyThinBorders(centerStyle);

            org.apache.poi.ss.usermodel.Font totalFont = workbook.createFont();
            totalFont.setBold(true);

            CellStyle totalStyle = workbook.createCellStyle();
            totalStyle.setFont(totalFont);
            totalStyle.setDataFormat(dataFormat.getFormat("#,##0"));
            totalStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalStyle.setBorderTop(BorderStyle.DOUBLE);
            totalStyle.setBorderBottom(BorderStyle.THIN);
            totalStyle.setBorderLeft(BorderStyle.THIN);
            totalStyle.setBorderRight(BorderStyle.THIN);

            CellStyle totalLabelStyle = workbook.createCellStyle();
            totalLabelStyle.setFont(totalFont);
            totalLabelStyle.setAlignment(HorizontalAlignment.CENTER);
            totalLabelStyle.setBorderTop(BorderStyle.DOUBLE);
            totalLabelStyle.setBorderBottom(BorderStyle.THIN);
            totalLabelStyle.setBorderLeft(BorderStyle.THIN);
            totalLabelStyle.setBorderRight(BorderStyle.THIN);

            org.apache.poi.ss.usermodel.Font bigTitleFont = workbook.createFont();
            bigTitleFont.setBold(true);
            bigTitleFont.setFontHeightInPoints((short) 14);
            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(bigTitleFont);

            // Title & metadata rows
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(sanitizeText("BÁO CÁO DOANH THU & ĐỐI SOÁT CLUCKY"));
            titleCell.setCellStyle(titleStyle);

            Row subRow = sheet.createRow(1);
            String storeLabel = report.storeId() == null ? "Toàn chuỗi" : "Quán #" + report.storeId();
            String updatedLabel = report.lastUpdatedAt() != null ? TIMESTAMP_FMT.format(report.lastUpdatedAt()) : "Chưa có dữ liệu";
            String timeLabel = "Kỳ báo cáo: " + report.from().format(DATE_FMT) + " đến " + report.to().format(DATE_FMT)
                    + " | Phạm vi: " + storeLabel
                    + " | Cập nhật cuối (UTC+7): " + updatedLabel;
            subRow.createCell(0).setCellValue(sanitizeText(timeLabel));

            Row policyRow = sheet.createRow(2);
            String policyNote = report.projectionActive()
                    ? "Projection realtime đang bật theo sự kiện: " + report.revenueEventPolicy()
                    : "Lưu ý projection: Tổng hợp event realtime đang chờ kích hoạt (policy=" + report.revenueEventPolicy() + ").";
            policyRow.createCell(0).setCellValue(sanitizeText(policyNote));

            // Header row (Row 4)
            int[] maxChars = new int[HEADERS.length];
            Row headerRow = sheet.createRow(4);
            headerRow.setHeightInPoints(28f);
            for (int i = 0; i < HEADERS.length; i++) {
                String safeHeader = sanitizeText(HEADERS[i]);
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(safeHeader);
                cell.setCellStyle(headerStyle);
                maxChars[i] = Math.min(26, safeHeader.length());
            }

            int rowIdx = 5;
            if (items.isEmpty()) {
                Row emptyRow = sheet.createRow(rowIdx++);
                Cell emptyCell = emptyRow.createCell(0);
                emptyCell.setCellValue(sanitizeText("Không có dữ liệu thống kê doanh thu trong kỳ đã chọn."));
                emptyCell.setCellStyle(centerStyle);
                for (int i = 1; i < HEADERS.length; i++) {
                    emptyRow.createCell(i).setCellStyle(centerStyle);
                }
            } else {
                int stt = 1;
                for (DailyStoreStatsResponse item : items) {
                    Row row = sheet.createRow(rowIdx++);

                    Cell c0 = row.createCell(0);
                    c0.setCellValue(stt++);
                    c0.setCellStyle(centerStyle);

                    Cell c1 = row.createCell(1);
                    String dateStr = sanitizeText(item.statDate() != null ? item.statDate().format(DATE_FMT) : "");
                    c1.setCellValue(dateStr);
                    c1.setCellStyle(centerStyle);
                    maxChars[1] = Math.max(maxChars[1], dateStr.length());

                    Cell c2 = row.createCell(2);
                    c2.setCellValue(item.storeId() != null ? item.storeId() : 0L);
                    c2.setCellStyle(centerStyle);

                    Cell c3 = row.createCell(3);
                    c3.setCellValue(countOrZero(item.orderCount()));
                    c3.setCellStyle(integerStyle);

                    setCurrencyCell(row, 4, item.codAmount(), currencyStyle, maxChars);
                    setCurrencyCell(row, 5, item.transferAmount(), currencyStyle, maxChars);
                    setCurrencyCell(row, 6, item.reconciledTransferAmount(), currencyStyle, maxChars);
                    setCurrencyCell(row, 7, item.pendingReconciliationAmount(), currencyStyle, maxChars);
                    setCurrencyCell(row, 8, item.excessAmount(), currencyStyle, maxChars);
                    setCurrencyCell(row, 9, item.expiredReceiptAmount(), currencyStyle, maxChars);
                    setCurrencyCell(row, 10, item.revenue(), currencyStyle, maxChars);
                }
            }

            // Total row
            Row totalRow = sheet.createRow(rowIdx++);
            Cell tLabel = totalRow.createCell(0);
            tLabel.setCellValue(sanitizeText("TỔNG CỘNG"));
            tLabel.setCellStyle(totalLabelStyle);
            for (int i = 1; i < 3; i++) {
                totalRow.createCell(i).setCellStyle(totalLabelStyle);
            }

            Cell tCount = totalRow.createCell(3);
            tCount.setCellValue(countOrZero(report.totalOrderCount()));
            tCount.setCellStyle(totalStyle);

            setCurrencyCell(totalRow, 4, report.totalCodAmount(), totalStyle, maxChars);
            setCurrencyCell(totalRow, 5, report.totalTransferAmount(), totalStyle, maxChars);
            setCurrencyCell(totalRow, 6, report.totalReconciledTransferAmount(), totalStyle, maxChars);
            setCurrencyCell(totalRow, 7, report.totalPendingReconciliationAmount(), totalStyle, maxChars);
            setCurrencyCell(totalRow, 8, report.totalExcessAmount(), totalStyle, maxChars);
            setCurrencyCell(totalRow, 9, report.totalExpiredReceiptAmount(), totalStyle, maxChars);
            setCurrencyCell(totalRow, 10, report.totalRevenue(), totalStyle, maxChars);

            Row footnoteRow = sheet.createRow(rowIdx + 1);
            footnoteRow.createCell(0).setCellValue(sanitizeText(
                    "Ghi chú: KTDT = Không tính vào doanh thu. Tiền 'CK chờ đối soát' chưa có xác nhận ngân hàng. Tiền dư & khoản nhận cho đơn hết hạn được theo dõi riêng, không cộng vào doanh thu hoặc số đơn."));

            for (int i = 0; i < HEADERS.length; i++) {
                int widthChars = Math.min(34, Math.max(10, maxChars[i] + 4));
                sheet.setColumnWidth(i, widthChars * 256);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Xuất báo cáo doanh thu ra định dạng PDF chuẩn A4 Landscape với Unicode tiếng Việt
     * từ OpenPDF Liberation fonts (không phụ thuộc font hệ điều hành).
     */
    public byte[] exportToPdf(RevenueReportResponse report) {
        List<DailyStoreStatsResponse> items = report.items() != null ? report.items() : List.of();
        if (items.size() > MAX_EXPORT_ROWS) {
            throw new ApiException(ErrorCode.REQUEST_TOO_LARGE);
        }

        Document document = new Document(PageSize.A4.rotate(), 24, 24, 28, 28);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = Liberation.SANS_BOLD.create(15);
            titleFont.setColor(CLUCKY_BURGUNDY);

            Font subFont = Liberation.SANS_ITALIC.create(9);
            subFont.setColor(CLUCKY_MUTED);

            Font headerFont = Liberation.SANS_BOLD.create(8);
            headerFont.setColor(Color.WHITE);

            Font dataFont = Liberation.SANS.create(8);
            dataFont.setColor(CLUCKY_DARK);

            Font boldFont = Liberation.SANS_BOLD.create(8);
            boldFont.setColor(CLUCKY_DARK);

            Font noteFont = Liberation.SANS.create(8);
            noteFont.setColor(CLUCKY_MUTED);

            Paragraph title = new Paragraph(sanitizeText("BÁO CÁO DOANH THU & ĐỐI SOÁT CLUCKY"), titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4f);
            document.add(title);

            String storeLabel = report.storeId() == null ? "Toàn chuỗi" : "Quán #" + report.storeId();
            String updatedLabel = report.lastUpdatedAt() != null ? TIMESTAMP_FMT.format(report.lastUpdatedAt()) : "Chưa có dữ liệu";
            String subText = "Kỳ báo cáo: " + report.from().format(DATE_FMT) + " đến " + report.to().format(DATE_FMT)
                    + " | Phạm vi: " + storeLabel
                    + " | Cập nhật cuối (UTC+7): " + updatedLabel;
            Paragraph subtitle = new Paragraph(sanitizeText(subText), subFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(10f);
            document.add(subtitle);

            PdfPTable table = new PdfPTable(new float[]{1.2f, 2.3f, 1.8f, 1.7f, 3.1f, 3.1f, 3.1f, 3.1f, 2.8f, 2.9f, 3.3f});
            table.setWidthPercentage(100f);
            table.setHeaderRows(1);

            for (String headerText : HEADERS) {
                PdfPCell headerCell = new PdfPCell(new Phrase(sanitizeText(headerText), headerFont));
                headerCell.setBackgroundColor(CLUCKY_DARK);
                headerCell.setBorderColor(CLUCKY_BORDER);
                headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                headerCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                headerCell.setPadding(5f);
                table.addCell(headerCell);
            }

            if (items.isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(new Phrase(
                        sanitizeText("Không có dữ liệu thống kê doanh thu trong kỳ đã chọn."), noteFont));
                emptyCell.setColspan(HEADERS.length);
                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                emptyCell.setBorderColor(CLUCKY_BORDER);
                emptyCell.setPadding(10f);
                table.addCell(emptyCell);
            } else {
                int stt = 1;
                for (DailyStoreStatsResponse item : items) {
                    addPdfCell(table, String.valueOf(stt++), dataFont, Element.ALIGN_CENTER);
                    addPdfCell(table, item.statDate() != null ? item.statDate().format(DATE_FMT) : "", dataFont, Element.ALIGN_CENTER);
                    addPdfCell(table, String.valueOf(item.storeId() != null ? item.storeId() : 0L), dataFont, Element.ALIGN_CENTER);
                    addPdfCell(table, CURRENCY_FMT.format(countOrZero(item.orderCount())), dataFont, Element.ALIGN_RIGHT);
                    addPdfCell(table, formatCurrency(item.codAmount()), dataFont, Element.ALIGN_RIGHT);
                    addPdfCell(table, formatCurrency(item.transferAmount()), dataFont, Element.ALIGN_RIGHT);
                    addPdfCell(table, formatCurrency(item.reconciledTransferAmount()), dataFont, Element.ALIGN_RIGHT);
                    addPdfCell(table, formatCurrency(item.pendingReconciliationAmount()), dataFont, Element.ALIGN_RIGHT);
                    addPdfCell(table, formatCurrency(item.excessAmount()), dataFont, Element.ALIGN_RIGHT);
                    addPdfCell(table, formatCurrency(item.expiredReceiptAmount()), dataFont, Element.ALIGN_RIGHT);
                    addPdfCell(table, formatCurrency(item.revenue()), boldFont, Element.ALIGN_RIGHT);
                }
            }

            PdfPCell totalLabelCell = new PdfPCell(new Phrase("TỔNG CỘNG", boldFont));
            totalLabelCell.setColspan(3);
            totalLabelCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            totalLabelCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            totalLabelCell.setBackgroundColor(CLUCKY_CREAM);
            totalLabelCell.setBorderColor(CLUCKY_BORDER);
            totalLabelCell.setPadding(5f);
            table.addCell(totalLabelCell);

            addPdfCell(table, CURRENCY_FMT.format(countOrZero(report.totalOrderCount())), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);
            addPdfCell(table, formatCurrency(report.totalCodAmount()), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);
            addPdfCell(table, formatCurrency(report.totalTransferAmount()), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);
            addPdfCell(table, formatCurrency(report.totalReconciledTransferAmount()), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);
            addPdfCell(table, formatCurrency(report.totalPendingReconciliationAmount()), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);
            addPdfCell(table, formatCurrency(report.totalExcessAmount()), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);
            addPdfCell(table, formatCurrency(report.totalExpiredReceiptAmount()), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);
            addPdfCell(table, formatCurrency(report.totalRevenue()), boldFont, Element.ALIGN_RIGHT, CLUCKY_CREAM);

            document.add(table);

            String policyNote = report.projectionActive()
                    ? "Projection realtime đang bật (" + report.revenueEventPolicy() + ")."
                    : "Projection realtime đang chờ kích hoạt (policy=" + report.revenueEventPolicy() + ").";
            Paragraph footnote = new Paragraph(sanitizeText(
                    "Ghi chú: KTDT = Không tính vào doanh thu. Khoản 'CK chờ đối soát' chưa được ngân hàng xác nhận. Tiền dư và khoản nhận sau hết hạn được tách riêng khỏi doanh thu và số đơn. " + policyNote),
                    noteFont);
            footnote.setSpacingBefore(8f);
            document.add(footnote);
        } catch (ApiException apiEx) {
            throw apiEx;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi kết xuất báo cáo PDF: " + e.getMessage(), e);
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }

        return out.toByteArray();
    }

    private void applyThinBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private void setCurrencyCell(Row row, int colIdx, BigDecimal amount, CellStyle style, int[] maxChars) {
        BigDecimal safe = amount != null ? amount : BigDecimal.ZERO;
        Cell cell = row.createCell(colIdx);
        cell.setCellValue(safe.doubleValue());
        cell.setCellStyle(style);
        maxChars[colIdx] = Math.max(maxChars[colIdx], CURRENCY_FMT.format(safe).length());
    }

    private int countOrZero(Integer value) {
        return value != null ? value : 0;
    }

    private void addPdfCell(PdfPTable table, String text, Font font, int alignment) {
        addPdfCell(table, text, font, alignment, null);
    }

    private void addPdfCell(PdfPTable table, String text, Font font, int alignment, Color bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(sanitizeText(text), font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBorderColor(CLUCKY_BORDER);
        cell.setPadding(4f);
        if (bgColor != null) {
            cell.setBackgroundColor(bgColor);
        }
        table.addCell(cell);
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) {
            return "0 đ";
        }
        return CURRENCY_FMT.format(amount) + " đ";
    }

    /**
     * Chống CSV/Formula Injection trong Excel/PDF nếu nội dung bắt đầu bằng ký tự công thức (=, +, -, @, \t, \r)
     */
    public static String sanitizeText(String input) {
        if (input == null || input.isEmpty()) {
            return "";
        }
        String trimmed = input.stripLeading();
        char firstChar = input.charAt(0);
        char firstNonSpace = trimmed.isEmpty() ? firstChar : trimmed.charAt(0);
        if (firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@'
                || firstChar == '\t' || firstChar == '\r'
                || firstNonSpace == '=' || firstNonSpace == '+' || firstNonSpace == '-' || firstNonSpace == '@') {
            return "'" + input;
        }
        return input;
    }
}
