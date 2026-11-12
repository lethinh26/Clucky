package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.*;
import com.clucky.promotionloyaltyservice.repository.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.Map;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ConflictException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import com.clucky.promotionloyaltyservice.model.VoucherStatus;
import com.clucky.promotionloyaltyservice.model.VoucherType;
import java.util.concurrent.*;
import javax.sql.DataSource;
import jakarta.persistence.EntityManagerFactory;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "CLUCKY_TEST_DB_URL", matches = ".+")
@SpringJUnitConfig(LoyaltyPostgresTest.Config.class)
class LoyaltyPostgresTest {
    @Configuration
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackageClasses = MemberPointsRepository.class)
    static class Config {
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource(System.getenv("CLUCKY_TEST_DB_URL"), "postgres", System.getenv("CLUCKY_TEST_DB_PASSWORD"));
        }
        @Bean(initMethod = "migrate") Flyway flyway(DataSource source) {
            return Flyway.configure().dataSource(source).schemas("promotion_service").locations("classpath:db/migration").load();
        }
        @Bean @DependsOn("flyway") LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setPackagesToScan("com.clucky.promotionloyaltyservice.entity", "com.clucky.promotionloyaltyservice.model");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.default_schema", "promotion_service"));
            return factory;
        }
        @Bean JpaTransactionManager transactionManager(EntityManagerFactory factory) { return new JpaTransactionManager(factory); }
        @Bean LoyaltyService service(DataSource source, VoucherAuditOutbox audit) {
            return new LoyaltyService(new JdbcTemplate(source), audit);
        }
        @Bean VoucherAuditOutbox audit(DataSource source, JpaTransactionManager manager) {
            return new VoucherAuditOutbox(new JdbcTemplate(source), new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules(),
                    org.mockito.Mockito.mock(org.springframework.kafka.core.KafkaTemplate.class), manager);
        }
        @Bean VoucherService vouchers(VoucherRepository repository, VoucherAuditOutbox audit) { return new VoucherService(repository, audit, org.mockito.Mockito.mock(VoucherStoreVerifier.class)); }
        @Bean VoucherReservationService reservations(VoucherRepository repository, VoucherService vouchers, DataSource source) {
            return new VoucherReservationService(repository, vouchers, new JdbcTemplate(source));
        }
    }

    @Autowired LoyaltyService service;
    @Autowired DataSource source;
    @Autowired VoucherService vouchers;
    @Autowired VoucherReservationService reservations;
    @Autowired VoucherRepository voucherRepository;
    @Autowired JpaTransactionManager transactionManager;

    @Test
    @org.springframework.transaction.annotation.Transactional
    void voucherFiltersHandleMissingAndCaseInsensitiveKeywordsOnPostgres() {
        var voucher = new com.clucky.promotionloyaltyservice.model.Voucher();
        voucher.setCode("FILTER_" + UUID.randomUUID());
        voucher.setTitle("Clucky Mixed Case " + UUID.randomUUID());
        voucher.setType(VoucherType.AMOUNT);
        voucher.setValue(BigDecimal.TEN);
        voucher.setStartAt(Instant.now().minusSeconds(60));
        voucher.setEndAt(Instant.now().plusSeconds(3600));
        voucher.setScope(com.clucky.promotionloyaltyservice.model.VoucherScope.STORE);
        voucher.setStoreId(987654L);
        voucher.setStatus(VoucherStatus.ACTIVE);
        voucherRepository.saveAndFlush(voucher);

        assertTrue(voucherRepository.findWithFilters(null, null, null, null).stream()
                .anyMatch(found -> found.getId().equals(voucher.getId())));
        assertTrue(voucherRepository.findWithFilters(null, null, null, "").stream()
                .anyMatch(found -> found.getId().equals(voucher.getId())));
        assertEquals(java.util.List.of(voucher), voucherRepository.findWithFilters(
                voucher.getScope(), voucher.getStoreId(), VoucherStatus.ACTIVE,
                voucher.getCode().toLowerCase(java.util.Locale.ROOT)));
        assertEquals(java.util.List.of(voucher), voucherRepository.findWithFilters(
                null, null, null, voucher.getTitle().toUpperCase(java.util.Locale.ROOT)));
        assertTrue(voucherRepository.findWithFilters(null, 987655L, null, voucher.getCode()).isEmpty());
        assertTrue(voucherRepository.findWithFilters(null, null, VoucherStatus.DISABLED, voucher.getCode()).isEmpty());
        assertTrue(voucherRepository.findWithFilters(null, null, null, "MISSING_" + UUID.randomUUID()).isEmpty());
    }

    @Test
    void concurrentApprovalsPersistOneApprovedState() throws Exception {
        var request = new VoucherRequest();
        request.setCode("TEST_" + java.util.UUID.randomUUID());
        request.setType(com.clucky.promotionloyaltyservice.model.VoucherType.AMOUNT);
        request.setValue(java.math.BigDecimal.TEN);
        request.setStartAt(java.time.Instant.now().minusSeconds(60));
        request.setEndAt(java.time.Instant.now().plusSeconds(3600));
        var proposal = vouchers.createStoreProposal(request, 7L, "STORE_MANAGER", 2L);
        race(() -> vouchers.approveVoucher(proposal.getId(), 1L, "ADMIN"));
        var approved = vouchers.getVoucherById(proposal.getId());
        assertEquals(com.clucky.promotionloyaltyservice.model.VoucherStatus.ACTIVE, approved.getStatus());
        assertEquals(1L, approved.getApprovedBy());
        assertEquals(2L, approved.getStoreId());
    }

    @Test
    void concurrentOrderRetriesHaveOneBalanceEffectPerOperation() throws Exception {
        long customer = ThreadLocalRandom.current().nextLong(1_000_000, Long.MAX_VALUE);
        long order = ThreadLocalRandom.current().nextLong(1_000_000, Long.MAX_VALUE - 1);
        var amount = new java.math.BigDecimal("5000000");
        var quote = service.preview(new LoyaltyData.PreviewInput(customer, 0, amount));
        var reservation = new LoyaltyData.ReserveInput(order, customer, 0, amount, quote.policyVersion(), quote.pointsAmount(), quote.tierDiscount());
        race(() -> service.reserve(reservation));
        race(() -> service.settle(order, customer, "COMPLETED", "event", "correlation"));
        assertEquals(500, service.overview(customer, 0, 10, "ALL").points().totalPoints());
        var redemption = service.preview(new LoyaltyData.PreviewInput(customer, 102, amount));
        var next = new LoyaltyData.ReserveInput(order + 1, customer, 102, amount, redemption.policyVersion(), redemption.pointsAmount(), redemption.tierDiscount());
        race(() -> service.reserve(next));
        assertEquals(398, service.overview(customer, 0, 10, "ALL").points().availablePoints());
        assertThrows(com.clucky.promotionloyaltyservice.exception.ConflictException.class,
                () -> service.settle(order + 1, customer + 1, "CANCELLED", "wrong-owner", "correlation"));
        race(() -> service.settle(order + 1, customer, "CANCELLED", "cancelled", "correlation"));
        service.settle(order + 1, customer, "COMPLETED", "late-completion", "correlation");
        var balance = service.overview(customer, 0, 10, "ALL").points();
        assertEquals(500, balance.totalPoints());
        assertEquals(0, balance.reservedPoints());
        assertEquals(3, new JdbcTemplate(source).queryForObject("SELECT count(*) FROM promotion_service.point_transactions WHERE customer_id = ?", Integer.class, customer));
    }

    @Test
    void finalVoucherSlotAndSameOrderRetriesAreSerialized() throws Exception {
        var voucher = vouchers.createVoucher(voucherRequest(1), 1L, "ADMIN", null);
        long customer = randomId();
        var sequence = new AtomicLong(randomId());
        var winner = new AtomicLong();
        var accepted = new AtomicInteger();
        race(() -> {
            long order = sequence.getAndIncrement();
            try {
                reservations.reserve(order, customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
                winner.set(order);
                accepted.incrementAndGet();
            } catch (ApiException failure) {
                assertEquals(ErrorCode.VOUCHER_EXHAUSTED, failure.getCode());
            }
        });
        assertEquals(1, accepted.get());
        race(() -> reservations.reserve(winner.get(), customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
        assertEquals(1, vouchers.getVoucherById(voucher.getId()).getReservedCount());
        assertEquals(0, vouchers.getVoucherById(voucher.getId()).getUsedCount());
        assertEquals(1, count("SELECT count(*) FROM promotion_service.voucher_reservations WHERE voucher_id=?", voucher.getId()));
        assertThrows(ConflictException.class, () -> reservations.reserve(winner.get(), customer + 1, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
        assertThrows(ConflictException.class, () -> reservations.reserve(winner.get(), customer, 2, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
        assertThrows(ConflictException.class, () -> reservations.reserve(winner.get(), customer, 1, voucher.getCode(), BigDecimal.valueOf(101), BigDecimal.TEN));
        assertThrows(ConflictException.class, () -> reservations.reserve(winner.get(), customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.ONE));
        assertThrows(ConflictException.class, () -> reservations.reserve(winner.get(), customer, 1, "OTHER", BigDecimal.valueOf(100), BigDecimal.TEN));
    }

    @Test
    void completionAndDuplicateEventsConsumeExactlyOnce() throws Exception {
        var voucher = vouchers.createVoucher(voucherRequest(1), 1L, "ADMIN", null);
        long order = randomId();
        long customer = randomId();
        String event = UUID.randomUUID().toString();
        reservations.reserve(order, customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
        assertThrows(ConflictException.class, () -> reservations.settle(order, customer + 1, "COMPLETED", event, "test"));
        race(() -> reservations.settle(order, customer, "COMPLETED", event, "test"));
        assertThrows(ConflictException.class, () -> reservations.release(order));
        reservations.settle(order, customer, "CANCELLED", UUID.randomUUID().toString(), "test");
        assertEquals(1, vouchers.getVoucherById(voucher.getId()).getUsedCount());
        assertEquals(0, vouchers.getVoucherById(voucher.getId()).getReservedCount());
        assertEquals(1, count("SELECT count(*) FROM promotion_service.voucher_usages WHERE order_id=?", order));
        assertEquals(1, count("SELECT count(*) FROM promotion_service.voucher_order_events WHERE event_id=?", event));
        var edit = voucherRequest(1);
        edit.setCode(voucher.getCode());
        edit.setStatus(VoucherStatus.DISABLED);
        edit.setVersion(vouchers.getVoucherById(voucher.getId()).getVersion());
        vouchers.updateVoucher(voucher.getId(), edit, 1L, "ADMIN", null);
        reservations.reserve(order, customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
    }

    @Test
    void releaseFencesDelayedRetriesAndActiveOrdersKeepTheirQuota() throws Exception {
        var voucher = vouchers.createVoucher(voucherRequest(1), 1L, "ADMIN", null);
        long aborted = randomId();
        long customer = randomId();
        race(() -> reservations.release(aborted));
        assertThrows(ConflictException.class, () -> reservations.reserve(aborted, customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
        long order = randomId();
        reservations.reserve(order, customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
        new JdbcTemplate(source).update("UPDATE promotion_service.voucher_reservations SET updated_at=now()-interval '1 day' WHERE order_id=?", order);
        assertTrue(service.pending().stream().anyMatch(pending -> pending.orderId() == order));
        reservations.settle(order, customer, "CONFIRMED", UUID.randomUUID().toString(), "test");
        assertEquals(1, vouchers.getVoucherById(voucher.getId()).getReservedCount());
        assertFalse(service.pending().stream().anyMatch(pending -> pending.orderId() == order));
        String event = UUID.randomUUID().toString();
        race(() -> reservations.settle(order, customer, "CANCELLED", event, "test"));
        reservations.settle(order, customer, "COMPLETED", UUID.randomUUID().toString(), "test");
        assertEquals(0, vouchers.getVoucherById(voucher.getId()).getReservedCount());
        assertEquals(0, vouchers.getVoucherById(voucher.getId()).getUsedCount());
        long missing = randomId();
        reservations.reserve(missing, customer, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
        reservations.settle(missing, customer, "MISSING", null, null);
        assertEquals(0, vouchers.getVoucherById(voucher.getId()).getReservedCount());
    }

    @Test
    void quoteMismatchScopeAndLegacyUsageCannotReserve() {
        var request = voucherRequest(2);
        request.setScope(com.clucky.promotionloyaltyservice.model.VoucherScope.STORE);
        request.setStoreId(2L);
        var voucher = vouchers.createVoucher(request, 1L, "ADMIN", null);
        assertThrows(ApiException.class, () -> reservations.reserve(randomId(), 7, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
        assertThrows(ConflictException.class, () -> reservations.reserve(randomId(), 7, 2, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.ONE));
        new JdbcTemplate(source).update("UPDATE promotion_service.vouchers SET used_count=2 WHERE id=?", voucher.getId());
        assertThrows(ApiException.class, () -> reservations.reserve(randomId(), 7, 2, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
        assertEquals(0, count("SELECT count(*) FROM promotion_service.voucher_reservations WHERE voucher_id=?", voucher.getId()));
    }

    @Test
    void cancellationBeforeReservationCreatesAnIdempotentFence() {
        var voucher = vouchers.createVoucher(voucherRequest(1), 1L, "ADMIN", null);
        long order = randomId();
        String event = UUID.randomUUID().toString();
        reservations.settle(order, 7, "CANCELLED", event, "test");
        reservations.settle(order, 7, "CANCELLED", event, "test");
        assertThrows(ConflictException.class, () -> reservations.reserve(order, 7, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
        assertEquals(0, vouchers.getVoucherById(voucher.getId()).getReservedCount());
        assertEquals(1, count("SELECT count(*) FROM promotion_service.voucher_order_events WHERE event_id=?", event));
    }

    @Test
    void adminQuotaUpdatesRejectStaleVersionsAndCannotEraseReservations() {
        var request = voucherRequest(3);
        var voucher = vouchers.createVoucher(request, 1L, "ADMIN", null);
        reservations.reserve(randomId(), 7, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
        request.setVersion(voucher.getVersion());
        assertThrows(ConflictException.class, () -> vouchers.updateVoucher(voucher.getId(), request, 1L, "ADMIN", null));
        request.setVersion(null);
        assertThrows(com.clucky.promotionloyaltyservice.exception.BadRequestException.class, () -> vouchers.updateVoucher(voucher.getId(), request, 1L, "ADMIN", null));
        reservations.reserve(randomId(), 7, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
        request.setVersion(vouchers.getVoucherById(voucher.getId()).getVersion());
        request.setTotalLimit(1);
        assertThrows(ConflictException.class, () -> vouchers.updateVoucher(voucher.getId(), request, 1L, "ADMIN", null));
        request.setTotalLimit(2);
        request.setVersion(vouchers.getVoucherById(voucher.getId()).getVersion());
        assertEquals(2, vouchers.updateVoucher(voucher.getId(), request, 1L, "ADMIN", null).getTotalLimit());
        vouchers.deleteVoucher(voucher.getId(), 1L, "ADMIN", null);
        assertEquals(VoucherStatus.DISABLED, vouchers.getVoucherById(voucher.getId()).getStatus());
        assertEquals(2, vouchers.getVoucherById(voucher.getId()).getReservedCount());
        assertThrows(ApiException.class, () -> reservations.reserve(randomId(), 7, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN));
    }

    @Test
    void disableRacingReservationNeverLosesTheHeldSlot() throws Exception {
        var voucher = vouchers.createVoucher(voucherRequest(1), 1L, "ADMIN", null);
        long order = randomId();
        var branch = new AtomicInteger();
        var accepted = new AtomicInteger();
        race(() -> {
            if (branch.getAndIncrement() == 0) vouchers.deleteVoucher(voucher.getId(), 1L, "ADMIN", null);
            else {
                try {
                    reservations.reserve(order, 7, 1, voucher.getCode(), BigDecimal.valueOf(100), BigDecimal.TEN);
                    accepted.incrementAndGet();
                } catch (ApiException failure) {
                    assertTrue(java.util.Set.of(ErrorCode.VOUCHER_NOT_FOUND, ErrorCode.VOUCHER_INACTIVE).contains(failure.getCode()));
                }
            }
        });
        assertEquals(accepted.get(), count("SELECT count(*) FROM promotion_service.voucher_reservations WHERE order_id=? AND state='RESERVED'", order));
        if (accepted.get() == 1) {
            assertEquals(VoucherStatus.DISABLED, vouchers.getVoucherById(voucher.getId()).getStatus());
            reservations.release(order);
            assertEquals(0, vouchers.getVoucherById(voucher.getId()).getReservedCount());
        }
    }

    @Test
    void auditOutboxCommitsAndRollsBackWithAdminMutation() {
        var request = voucherRequest(1);
        var voucher = vouchers.createVoucher(request, 1L, "ADMIN", null);
        assertEquals(1, count("SELECT count(*) FROM promotion_service.audit_outbox WHERE event->'payload'->>'targetType'='VOUCHER' AND event->'payload'->>'targetId'=?", voucher.getId().toString()));
        var transaction = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        var rolledBackId = new AtomicLong();
        transaction.executeWithoutResult(status -> {
            rolledBackId.set(vouchers.createVoucher(voucherRequest(1), 1L, "ADMIN", null).getId());
            status.setRollbackOnly();
        });
        assertEquals(0, count("SELECT count(*) FROM promotion_service.vouchers WHERE id=?", rolledBackId.get()));
        assertEquals(0, count("SELECT count(*) FROM promotion_service.audit_outbox WHERE event->'payload'->>'targetType'='VOUCHER' AND event->'payload'->>'targetId'=?", Long.toString(rolledBackId.get())));
    }

    private VoucherRequest voucherRequest(int limit) {
        var request = new VoucherRequest();
        request.setCode("TEST_" + UUID.randomUUID());
        request.setType(VoucherType.AMOUNT);
        request.setValue(BigDecimal.TEN);
        request.setTotalLimit(limit);
        request.setMinOrderAmount(BigDecimal.valueOf(100));
        request.setStartAt(Instant.now().minusSeconds(3600));
        request.setEndAt(Instant.now().plusSeconds(3600));
        return request;
    }

    private long randomId() { return ThreadLocalRandom.current().nextLong(1_000_000, Long.MAX_VALUE - 100); }

    private int count(String sql, Object argument) { return new JdbcTemplate(source).queryForObject(sql, Integer.class, argument); }

    private void race(Runnable operation) throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            Callable<Void> task = () -> { start.await(); operation.run(); return null; };
            var first = executor.submit(task);
            var second = executor.submit(task);
            start.countDown();
            first.get(20, TimeUnit.SECONDS);
            second.get(20, TimeUnit.SECONDS);
        }
    }
}
