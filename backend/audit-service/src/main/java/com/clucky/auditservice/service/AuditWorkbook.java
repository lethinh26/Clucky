package com.clucky.auditservice.service;

import com.clucky.auditservice.dto.AuditLogQuery;
import com.clucky.auditservice.entity.AuditLog;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;

final class AuditWorkbook {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").withZone(VIETNAM);
    private static final String[] HEADERS = {"STT", "Thời gian (UTC+7)", "Hành động (mã)", "Loại đối tượng", "Mã đối tượng",
            "Mã tài khoản", "Vai trò", "Mã chi nhánh", "Nghiệp vụ", "Mã sự kiện", "Mã tương quan"};
    private static final Map<String, String> ROLES = Map.of("ADMIN", "Quản trị hệ thống", "STORE_MANAGER", "Quản lý chi nhánh",
            "STAFF", "Tác nghiệp chi nhánh", "CUSTOMER", "Khách hàng", "SHIPPER", "Giao hàng", "SYSTEM", "Hệ thống",
            "INTERNAL_SERVICE", "Dịch vụ nội bộ");
    private static final Map<String, String> DOMAINS = Map.of("identity-service", "Tài khoản", "cart-order-service", "Đơn hàng",
            "payment-service", "Thanh toán", "catalog-store-service", "Thực đơn & chi nhánh",
            "promotion-loyalty-service", "Khuyến mãi & thành viên", "review-report-service", "Đánh giá & báo cáo",
            "notification-service", "Thông báo", "shipping-service", "Vận chuyển");

    private AuditWorkbook() {}

    static byte[] write(List<AuditLog> entries, AuditLogQuery query, Instant exportedAt) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            workbook.getProperties().getCoreProperties().setTitle("Clucky - Nhật ký quản trị");
            workbook.getProperties().getCoreProperties().setCreator("Clucky");
            XSSFSheet sheet = workbook.createSheet("Nhật ký quản trị");
            sheet.setDisplayGridlines(false);
            sheet.setZoom(90);
            sheet.setDefaultRowHeightInPoints(32);

            XSSFCellStyle title = style(workbook, "8F1216", "FFFFFF", true, 20);
            XSSFFont titleFont = workbook.createFont();
            titleFont.setFontName("Fredoka");
            titleFont.setFontHeightInPoints((short) 20);
            titleFont.setBold(true);
            titleFont.setColor(color("FFFFFF"));
            title.setFont(titleFont);
            XSSFCellStyle subtitle = style(workbook, "16100D", "E4C76F", false, 11);
            XSSFCellStyle metadata = style(workbook, "F5EDE0", "6B6259", false, 11);
            XSSFCellStyle header = style(workbook, "8F1216", "FFFFFF", true, 11);
            XSSFCellStyle[] body = {style(workbook, "FFFFFF", "16100D", false, 11), style(workbook, "FFF8ED", "16100D", false, 11)};
            XSSFCellStyle[] dates = new XSSFCellStyle[2];
            for (int band = 0; band < body.length; band++) {
                body[band].setBorderBottom(BorderStyle.HAIR);
                body[band].setBottomBorderColor(color("E8E2D9"));
                dates[band] = workbook.createCellStyle();
                dates[band].cloneStyleFrom(body[band]);
                dates[band].setDataFormat(workbook.createDataFormat().getFormat("dd/mm/yyyy hh:mm:ss"));
            }

            banner(sheet, 0, "CLUCKY  |  NHẬT KÝ QUẢN TRỊ", title, 42);
            banner(sheet, 1, "LỊCH SỬ HOẠT ĐỘNG HỆ THỐNG  •  GIỜ VIỆT NAM (UTC+7)", subtitle, 26);
            banner(sheet, 2, "Số bản ghi: " + entries.size() + "   •   Xuất lúc: " + TIME.format(exportedAt), metadata, 26);
            String filters = filters(query);
            banner(sheet, 3, "Bộ lọc: " + filters, metadata, filters.length() > 140 ? 56 : 36);
            banner(sheet, 4, "Mã tài khoản/chi nhánh là ID hệ thống. Mã sự kiện và mã tương quan được giữ tại cột J–K (đang ẩn).", metadata, 26);
            Row heading = sheet.createRow(5);
            heading.setHeightInPoints(34);
            int[] widths = {7, 24, 34, 22, 18, 18, 27, 18, 29, 42, 42};
            for (int column = 0; column < HEADERS.length; column++) {
                Cell cell = heading.createCell(column);
                cell.setCellValue(HEADERS[column]);
                cell.setCellStyle(header);
                sheet.setColumnWidth(column, widths[column] * 256);
            }
            for (int index = 0; index < entries.size(); index++) {
                AuditLog entry = entries.get(index);
                Row row = sheet.createRow(index + 6);
                int band = index % 2;
                Object[] values = {index + 1, null, entry.getAction(), entry.getTargetType(), entry.getTargetId(),
                        entry.getActorId(), label(ROLES, entry.getActorRole()), entry.getStoreId(),
                        label(DOMAINS, entry.getSourceService()), entry.getEventId(), entry.getCorrelationId()};
                for (int column = 0; column < values.length; column++) {
                    Cell cell = row.createCell(column);
                    cell.setCellStyle(body[band]);
                    if (column == 0) cell.setCellValue(index + 1);
                    else if (column == 1 && entry.getOccurredAt() != null) {
                        cell.setCellValue(LocalDateTime.ofInstant(entry.getOccurredAt(), VIETNAM));
                        cell.setCellStyle(dates[band]);
                    } else cell.setCellValue(values[column] == null ? "—" : values[column].toString());
                }
            }
            sheet.createFreezePane(2, 6);
            sheet.setAutoFilter(new CellRangeAddress(5, Math.max(5, entries.size() + 5), 0, HEADERS.length - 1));
            sheet.setColumnHidden(9, true);
            sheet.setColumnHidden(10, true);
            sheet.setRepeatingRows(new CellRangeAddress(0, 5, -1, -1));
            sheet.setFitToPage(true);
            sheet.getPrintSetup().setLandscape(true);
            sheet.getPrintSetup().setPaperSize(PrintSetup.A4_PAPERSIZE);
            sheet.getPrintSetup().setFitWidth((short) 1);
            sheet.getPrintSetup().setFitHeight((short) 0);
            workbook.setPrintArea(0, 0, 8, 0, Math.max(5, entries.size() + 5));
            sheet.getFooter().setLeft("Clucky • Nhật ký quản trị");
            sheet.getFooter().setRight("Trang &P / &N");
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException failure) {
            throw new IllegalStateException("Could not generate audit workbook", failure);
        }
    }

    private static XSSFColor color(String hex) {
        return new XSSFColor(java.util.HexFormat.of().parseHex(hex), new DefaultIndexedColorMap());
    }

    private static XSSFCellStyle style(XSSFWorkbook workbook, String background, String foreground, boolean bold, int size) {
        XSSFFont font = workbook.createFont();
        font.setFontName("Quicksand");
        font.setFontHeightInPoints((short) size);
        font.setBold(bold);
        font.setColor(color(foreground));
        XSSFCellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(color(background));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        return style;
    }

    private static void banner(XSSFSheet sheet, int index, String text, CellStyle style, int height) {
        Row row = sheet.createRow(index);
        row.setHeightInPoints(height);
        for (int column = 0; column < HEADERS.length; column++) row.createCell(column).setCellStyle(style);
        row.getCell(0).setCellValue(text);
        sheet.addMergedRegion(new CellRangeAddress(index, index, 0, HEADERS.length - 1));
    }

    private static String label(Map<String, String> labels, String value) {
        return value == null ? "—" : labels.getOrDefault(value, value);
    }

    private static String filters(AuditLogQuery query) {
        List<String> filters = new ArrayList<>();
        if (query.from() != null) filters.add("Từ " + TIME.format(query.from()));
        if (query.to() != null) filters.add("Đến " + TIME.format(query.to()));
        if (query.sourceService() != null) filters.add("Nghiệp vụ: " + label(DOMAINS, query.sourceService()));
        if (query.actorId() != null) filters.add("Tài khoản: " + query.actorId());
        if (query.actorRole() != null) filters.add("Vai trò: " + label(ROLES, query.actorRole()));
        if (query.storeId() != null) filters.add("Mã chi nhánh: " + query.storeId());
        if (query.action() != null) filters.add("Hành động: " + query.action());
        if (query.targetType() != null) filters.add("Đối tượng: " + query.targetType());
        if (query.targetId() != null) filters.add("Mã đối tượng: " + query.targetId());
        return filters.isEmpty() ? "Tất cả nhật ký" : String.join("  •  ", filters);
    }
}
