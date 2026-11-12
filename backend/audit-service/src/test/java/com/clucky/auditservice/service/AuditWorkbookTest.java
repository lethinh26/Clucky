package com.clucky.auditservice.service;

import com.clucky.auditservice.dto.AuditLogQuery;
import com.clucky.auditservice.entity.AuditLog;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditWorkbookTest {
    @Test
    void exportsStyledVietnameseWorkbookWithoutLosingIdsOrTreatingTextAsFormulas() throws Exception {
        Instant occurredAt = Instant.parse("2026-11-11T18:30:45Z");
        AuditLog entry = mock(AuditLog.class);
        when(entry.getOccurredAt()).thenReturn(occurredAt);
        when(entry.getActorId()).thenReturn(Long.MAX_VALUE);
        when(entry.getStoreId()).thenReturn(null);
        when(entry.getActorRole()).thenReturn("ADMIN");
        when(entry.getSourceService()).thenReturn("promotion-loyalty-service");
        when(entry.getAction()).thenReturn("VOUCHER_APPROVED");
        when(entry.getTargetType()).thenReturn("VOUCHER");
        when(entry.getTargetId()).thenReturn(Long.MAX_VALUE);
        when(entry.getEventId()).thenReturn("=1+1");
        AuditLogQuery query = new AuditLogQuery(null, "ADMIN", null, null, null, null, null,
                occurredAt, null, null, null);

        byte[] file = AuditWorkbook.write(List.of(entry, entry), query, occurredAt);
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(file))) {
            var sheet = workbook.getSheetAt(0);
            assertEquals("Nhật ký quản trị", sheet.getSheetName());
            assertEquals("CLUCKY  |  NHẬT KÝ QUẢN TRỊ", sheet.getRow(0).getCell(0).getStringCellValue());
            assertTrue(sheet.getRow(2).getCell(0).getStringCellValue().contains("Số bản ghi: 2"));
            assertTrue(sheet.getRow(3).getCell(0).getStringCellValue().contains("Từ 12/11/2026 01:30:45"));
            assertTrue(sheet.getRow(3).getCell(0).getStringCellValue().contains("Vai trò: Quản trị hệ thống"));
            assertEquals("Thời gian (UTC+7)", sheet.getRow(5).getCell(1).getStringCellValue());
            var row = sheet.getRow(6);
            assertEquals(LocalDateTime.of(2026, 11, 12, 1, 30, 45), row.getCell(1).getLocalDateTimeCellValue());
            assertEquals("dd/mm/yyyy hh:mm:ss", row.getCell(1).getCellStyle().getDataFormatString());
            assertEquals(Long.toString(Long.MAX_VALUE), row.getCell(4).getStringCellValue());
            assertEquals(Long.toString(Long.MAX_VALUE), row.getCell(5).getStringCellValue());
            assertEquals("Quản trị hệ thống", row.getCell(6).getStringCellValue());
            assertEquals("—", row.getCell(7).getStringCellValue());
            assertEquals("Khuyến mãi & thành viên", row.getCell(8).getStringCellValue());
            assertEquals(CellType.STRING, row.getCell(9).getCellType());
            assertEquals("=1+1", row.getCell(9).getStringCellValue());
            assertEquals(11, row.getLastCellNum());
            assertNotEquals(row.getCell(0).getCellStyle().getIndex(), sheet.getRow(7).getCell(0).getCellStyle().getIndex());
            assertFalse(sheet.isDisplayGridlines());
            assertTrue(sheet.getPaneInformation().isFreezePane());
            assertEquals(2, sheet.getPaneInformation().getVerticalSplitPosition());
            assertEquals(6, sheet.getPaneInformation().getHorizontalSplitPosition());
            assertEquals("A6:K8", sheet.getCTWorksheet().getAutoFilter().getRef());
            assertTrue(sheet.isColumnHidden(9));
            assertTrue(sheet.isColumnHidden(10));
        }
        verify(entry, never()).getDetail();
    }

    @Test
    void exportsHeadersAndMetadataForEmptyResults() throws Exception {
        AuditLogQuery query = new AuditLogQuery(null, null, null, null, null, null, null, null, null, null, null);
        byte[] file = AuditWorkbook.write(List.of(), query, Instant.EPOCH);
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(file))) {
            var sheet = workbook.getSheetAt(0);
            assertEquals(5, sheet.getLastRowNum());
            assertTrue(sheet.getRow(2).getCell(0).getStringCellValue().contains("Số bản ghi: 0"));
            assertEquals("Bộ lọc: Tất cả nhật ký", sheet.getRow(3).getCell(0).getStringCellValue());
            assertEquals("A6:K6", sheet.getCTWorksheet().getAutoFilter().getRef());
        }
    }
}
