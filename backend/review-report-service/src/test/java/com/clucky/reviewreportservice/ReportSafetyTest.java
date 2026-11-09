package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.controller.ReportController;
import com.clucky.reviewreportservice.entity.DailyStoreStats;
import com.clucky.reviewreportservice.exception.ForbiddenException;
import com.clucky.reviewreportservice.repository.DailyStoreStatsRepository;
import com.clucky.reviewreportservice.service.ReportExportService;
import com.clucky.reviewreportservice.service.ReportService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportSafetyTest {
    private final DailyStoreStatsRepository repository = mock(DailyStoreStatsRepository.class);
    private final ReportExportService exporter = mock(ReportExportService.class);
    private final ReportService service = new ReportService(repository, exporter);

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesJwtIdentityAndEnforcesEndpointRoles() throws Exception {
        try (var context = new AnnotationConfigApplicationContext(MethodSecurityConfig.class)) {
            ReportController controller = context.getBean(ReportController.class);
            ReportService reports = context.getBean(ReportService.class);
            LocalDate from = LocalDate.of(2026, 11, 1);
            LocalDate to = LocalDate.of(2026, 11, 5);
            authenticate("STORE_MANAGER");
            controller.getDashboard(null, from, to);
            controller.getRevenueReport(null, from, to);
            verify(reports).getDashboard(7L, "STORE_MANAGER", 3L, null, from, to);
            verify(reports).getRevenueReport(7L, "STORE_MANAGER", 3L, null, from, to);
            when(reports.exportReport(7L, "STORE_MANAGER", 3L, null, from, to, "xlsx"))
                    .thenReturn(new byte[]{1});
            var file = controller.exportReport("xlsx", null, from, to);
            verify(reports).exportReport(7L, "STORE_MANAGER", 3L, null, from, to, "xlsx");
            assertEquals("attachment; filename=\"revenue-report-store3-2026-11-01-2026-11-05.xlsx\"",
                    file.getHeaders().getFirst("Content-Disposition"));
            authenticate("STAFF");
            assertThrows(AccessDeniedException.class, () -> controller.getDashboard(null, null, null));
            assertThrows(AccessDeniedException.class, () -> controller.getRevenueReport(null, null, null));
            assertThrows(AccessDeniedException.class, () -> controller.exportReport("pdf", null, null, null));
            for (String role : List.of("CUSTOMER", "SHIPPER")) {
                authenticate(role);
                assertThrows(AccessDeniedException.class, () -> controller.getDashboard(null, null, null));
                assertThrows(AccessDeniedException.class, () -> controller.getRevenueReport(null, null, null));
                assertThrows(AccessDeniedException.class, () -> controller.exportReport("xlsx", null, null, null));
            }
            verifyNoMoreInteractions(reports);
        }
    }

    @Test
    void staffCannotReadDashboardEvenForOwnStore() {
        assertThrows(ForbiddenException.class, () -> service.getDashboard(7L, "STAFF", 3L, null, null, null));
        verifyNoInteractions(repository);
        verifyNoInteractions(exporter);
    }

    @Test
    void rejectsUnauthorizedScopesBeforeReadingStats() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        for (String role : List.of("STAFF", "STORE_MANAGER")) {
            assertThrows(ForbiddenException.class,
                    () -> service.getDashboard(7L, role, 3L, 4L, null, null));
            assertThrows(ForbiddenException.class,
                    () -> service.getDashboard(7L, role, null, null, null, null));
        }
        assertThrows(ForbiddenException.class,
                () -> service.getDashboard(7L, "STAFF", 3L, null, yesterday, null));
        assertThrows(ForbiddenException.class,
                () -> service.getDashboard(7L, "STAFF", 3L, null, null, yesterday));
        assertThrows(ForbiddenException.class,
                () -> service.getRevenueReport(7L, "STAFF", 3L, null, null, null));
        assertThrows(ForbiddenException.class,
                () -> service.exportReport(7L, "STAFF", 3L, null, null, null, "xlsx"));
        assertThrows(ForbiddenException.class,
                () -> service.getRevenueReport(7L, "STORE_MANAGER", 3L, 4L, null, null));
        assertThrows(ForbiddenException.class,
                () -> service.exportReport(7L, "STORE_MANAGER", 3L, 4L, null, null, "pdf"));
        verifyNoInteractions(repository, exporter);
    }

    @Test
    void dashboardRevenueAndBothExportsUseTheSamePeriod() throws Exception {
        LocalDate to = LocalDate.of(2026, 11, 5);
        LocalDate from = to.withDayOfMonth(1);
        when(repository.findByStoreIdAndStatDateBetweenOrderByStatDateAsc(3L, from, to))
                .thenReturn(List.of(stats(3L, from), stats(3L, to)));
        var dashboard = service.getDashboard(7L, "STORE_MANAGER", 3L, null, null, to);
        var revenue = service.getRevenueReport(7L, "STORE_MANAGER", 3L, null, from, to);
        assertEquals(from, dashboard.from());
        assertEquals(to, dashboard.to());
        assertEquals(new BigDecimal("300"), dashboard.periodRevenue());
        assertEquals(4, dashboard.periodOrderCount());
        assertEquals(revenue.totalRevenue(), dashboard.periodRevenue());
        assertEquals(revenue.totalOrderCount(), dashboard.periodOrderCount());
        assertEquals(new BigDecimal("200"), revenue.totalCodAmount());
        assertEquals(new BigDecimal("100"), revenue.totalTransferAmount());
        service.exportReport(7L, "STORE_MANAGER", 3L, null, null, to, "xlsx");
        service.exportReport(7L, "STORE_MANAGER", 3L, null, from, to, "pdf");
        verify(exporter).exportToExcel(revenue);
        verify(exporter).exportToPdf(revenue);
    }

    @Test
    void explicitRangeOverridesTheMonthDefaultForAllOutputs() throws Exception {
        LocalDate from = LocalDate.of(2026, 10, 6);
        LocalDate to = LocalDate.of(2026, 11, 5);
        when(repository.findByStoreIdAndStatDateBetweenOrderByStatDateAsc(3L, from, to))
                .thenReturn(List.of(stats(3L, from), stats(3L, to)));
        var dashboard = service.getDashboard(7L, "STORE_MANAGER", 3L, null, from, to);
        var revenue = service.getRevenueReport(7L, "STORE_MANAGER", 3L, null, from, to);
        assertEquals(from, dashboard.from());
        assertEquals(to, dashboard.to());
        assertEquals(new BigDecimal("300"), dashboard.periodRevenue());
        assertEquals(revenue.totalRevenue(), dashboard.periodRevenue());
        service.exportReport(7L, "STORE_MANAGER", 3L, null, from, to, "xlsx");
        service.exportReport(7L, "STORE_MANAGER", 3L, null, from, to, "pdf");
        verify(exporter).exportToExcel(revenue);
        verify(exporter).exportToPdf(revenue);
    }

    @Test
    void defaultsToCurrentMonthAndAllowsAdminChainOrStore() {
        LocalDate today = LocalDate.now();
        LocalDate first = today.withDayOfMonth(1);
        when(repository.findByStatDateBetweenOrderByStatDateAsc(first, today))
                .thenReturn(List.of(stats(3L, today), stats(4L, today)));
        var dashboard = service.getDashboard(7L, "ADMIN", null, null, null, null);
        var revenue = service.getRevenueReport(7L, "ADMIN", null, null, null, null);
        assertEquals("CHAIN", dashboard.scope());
        assertNull(dashboard.storeId());
        assertEquals(first, dashboard.from());
        assertEquals(today, dashboard.to());
        assertEquals(new BigDecimal("300"), dashboard.periodRevenue());
        assertEquals(revenue.totalRevenue(), dashboard.periodRevenue());
        when(repository.findByStoreIdAndStatDateBetweenOrderByStatDateAsc(4L, first, today))
                .thenReturn(List.of(stats(4L, today)));
        var store = service.getDashboard(7L, "ADMIN", null, 4L, null, null);
        assertEquals("STORE", store.scope());
        assertEquals(4L, store.storeId());
        assertEquals(new BigDecimal("150"), store.periodRevenue());
    }

    @Test
    void rejectsInvalidFiltersAndFormat() {
        LocalDate to = LocalDate.of(2026, 11, 5);
        assertThrows(IllegalArgumentException.class,
                () -> service.getDashboard(7L, "ADMIN", null, null, to.plusDays(1), to));
        assertThrows(IllegalArgumentException.class,
                () -> service.getRevenueReport(7L, "ADMIN", null, null, to.plusDays(1), to));
        assertThrows(IllegalArgumentException.class,
                () -> service.exportReport(7L, "ADMIN", null, null, to.plusDays(1), to, "pdf"));
        assertThrows(IllegalArgumentException.class,
                () -> service.exportReport(7L, "ADMIN", null, null, null, null, "csv"));
        assertThrows(IllegalArgumentException.class,
                () -> service.getDashboard(7L, "ADMIN", null, 0L, null, null));
        verifyNoInteractions(repository, exporter);
    }

    private DailyStoreStats stats(Long storeId, LocalDate date) {
        DailyStoreStats stats = new DailyStoreStats(storeId, date);
        stats.setOrderCount(2);
        stats.setRevenue(new BigDecimal("150"));
        stats.setCodAmount(new BigDecimal("100"));
        stats.setTransferAmount(new BigDecimal("50"));
        return stats;
    }

    private void authenticate(String role) {
        Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "HS256")
                .subject("7").claim("role", role).claim("storeId", 3L).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class MethodSecurityConfig {
        @Bean
        ReportService reportService() { return mock(ReportService.class); }

        @Bean
        ReportController reportController(ReportService reports) { return new ReportController(reports); }
    }
}
