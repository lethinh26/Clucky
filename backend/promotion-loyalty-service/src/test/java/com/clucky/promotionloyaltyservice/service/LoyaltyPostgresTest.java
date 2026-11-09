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
        @Bean LoyaltyService service(DataSource source) {
            return new LoyaltyService(new JdbcTemplate(source));
        }
        @Bean VoucherService vouchers(VoucherRepository repository) { return new VoucherService(repository); }
    }

    @Autowired LoyaltyService service;
    @Autowired DataSource source;
    @Autowired VoucherService vouchers;

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
