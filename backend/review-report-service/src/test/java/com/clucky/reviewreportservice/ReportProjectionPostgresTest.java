package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.repository.*;
import com.clucky.reviewreportservice.service.ReportProjectionService;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

import static com.clucky.reviewreportservice.ReportProjectionTest.event;
import static org.junit.jupiter.api.Assertions.*;

@SpringJUnitConfig(ReportProjectionPostgresTest.Config.class)
@EnabledIfEnvironmentVariable(named = "CLUCKY_TEST_DB_URL", matches = ".+")
class ReportProjectionPostgresTest {
    @Configuration
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackageClasses = DailyStoreStatsRepository.class)
    static class Config {
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource(System.getenv("CLUCKY_TEST_DB_URL"), "postgres", System.getenv("CLUCKY_TEST_DB_PASSWORD"));
        }
        @Bean(initMethod = "migrate") Flyway flyway(DataSource source) {
            return Flyway.configure().dataSource(source).schemas("review_report_service").locations("classpath:db/migration").load();
        }
        @Bean @DependsOn("flyway") LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setPackagesToScan("com.clucky.reviewreportservice.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.default_schema", "review_report_service"));
            return factory;
        }
        @Bean JpaTransactionManager transactionManager(EntityManagerFactory factory) { return new JpaTransactionManager(factory); }
        @Bean ReportProjectionService orderPolicy(DailyStoreStatsRepository stats, OrderProjectionTrackerRepository trackers, ProcessedEventRepository events) {
            return new ReportProjectionService(stats, trackers, events, "order.completed");
        }
        @Bean ReportProjectionService paymentPolicy(DailyStoreStatsRepository stats, OrderProjectionTrackerRepository trackers, ProcessedEventRepository events) {
            return new ReportProjectionService(stats, trackers, events, "payment.confirmed");
        }
    }

    @Autowired @Qualifier("orderPolicy") ReportProjectionService orderPolicy;
    @Autowired @Qualifier("paymentPolicy") ReportProjectionService paymentPolicy;
    @Autowired DataSource source;

    private long id() { return ThreadLocalRandom.current().nextLong(1_000_000, Long.MAX_VALUE); }
    private DomainEvent order(long order, Long store) {
        return event(UUID.randomUUID().toString(), "order.completed", order, store, "2026-11-04T17:01:00Z");
    }
    private DomainEvent payment(long order, Long store) {
        var event = event(UUID.randomUUID().toString(), "payment.confirmed", order, store, "2026-11-04T16:59:00Z");
        ((ObjectNode) event.payload()).put("amount", 90000).put("method", "BANK_TRANSFER");
        return event;
    }
    private void assertStats(long store, String day, int count, int revenue, int cod, int transfer) {
        var row = new JdbcTemplate(source).queryForMap("SELECT * FROM review_report_service.daily_store_stats WHERE store_id=? AND stat_date=?::date", store, day);
        assertEquals(count, ((Number) row.get("order_count")).intValue());
        assertEquals(new BigDecimal(revenue), row.get("revenue"));
        assertEquals(new BigDecimal(cod), row.get("cod_amount"));
        assertEquals(new BigDecimal(transfer), row.get("transfer_amount"));
    }

    @Test
    void selectedPolicyNotArrivalOrderDeterminesDateMoneyAndMethod() {
        for (var policy : new ReportProjectionService[] {orderPolicy, paymentPolicy}) {
            for (boolean paymentFirst : new boolean[] {true, false}) {
                long order = id();
                long store = id();
                var completed = order(order, store);
                var confirmed = payment(order, store);
                policy.processProjectionEvent(paymentFirst ? confirmed : completed);
                policy.processProjectionEvent(paymentFirst ? completed : confirmed);
                assertFalse(policy.processProjectionEvent(confirmed));
                assertFalse(policy.processProjectionEvent(completed));
                if (policy == orderPolicy) { assertStats(store, "2026-11-05", 1, 120000, 120000, 0); }
                else { assertStats(store, "2026-11-04", 1, 90000, 0, 90000); }
                assertEquals(1, new JdbcTemplate(source).queryForObject("SELECT count(*) FROM review_report_service.daily_store_stats WHERE store_id=?", Integer.class, store));
            }
        }
    }

    @Test
    void missingStoreRecoversFromLaterCompanionWithoutLosingAuthoritativeFacts() {
        long order = id();
        long store = id();
        assertFalse(paymentPolicy.processProjectionEvent(payment(order, null)));
        assertTrue(paymentPolicy.processProjectionEvent(order(order, store)));
        assertStats(store, "2026-11-04", 1, 90000, 0, 90000);
        assertFalse(paymentPolicy.processProjectionEvent(order(order, store)));
    }

    @Test
    void concurrentDifferentEventsAndDuplicateIdsContributeOnce() throws Exception {
        long order = id();
        long store = id();
        var completed = order(order, store);
        var confirmed = payment(order, store);
        race(() -> orderPolicy.processProjectionEvent(completed), () -> orderPolicy.processProjectionEvent(confirmed));
        var retry = order(order, store);
        race(() -> orderPolicy.processProjectionEvent(retry), () -> orderPolicy.processProjectionEvent(retry));
        assertStats(store, "2026-11-05", 1, 120000, 120000, 0);
        long secondOrder = id();
        race(() -> orderPolicy.processProjectionEvent(order(secondOrder, store)), () -> orderPolicy.processProjectionEvent(order(secondOrder, store)));
        assertStats(store, "2026-11-05", 2, 240000, 240000, 0);
    }

    @Test
    void concurrentDifferentOrdersDoNotLoseDailyDeltas() throws Exception {
        long store = id();
        race(() -> orderPolicy.processProjectionEvent(order(id(), store)), () -> orderPolicy.processProjectionEvent(order(id(), store)));
        assertStats(store, "2026-11-05", 2, 240000, 240000, 0);
    }

    @Test
    void sqlFailureRollsBackClaimAndTrackerSoRetryCanSucceed() {
        long store = id();
        long order = id();
        var event = order(order, store);
        var jdbc = new JdbcTemplate(source);
        jdbc.update("INSERT INTO review_report_service.daily_store_stats (store_id,stat_date,order_count,revenue,cod_amount,transfer_amount) VALUES (?, '2026-11-05',1,999999999999,0,0)", store);
        assertThrows(RuntimeException.class, () -> orderPolicy.processProjectionEvent(event));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM review_report_service.processed_events WHERE event_id=?", Integer.class, event.eventId()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM review_report_service.order_projection_trackers WHERE order_id=?", Integer.class, order));
        jdbc.update("DELETE FROM review_report_service.daily_store_stats WHERE store_id=?", store);
        assertTrue(orderPolicy.processProjectionEvent(event));
        assertStats(store, "2026-11-05", 1, 120000, 120000, 0);
    }

    @Test
    void changedStoreOrAuthoritativeFactsRequireReconciliationAndCancellationDoesNotGuessRefund() {
        long order = id();
        long store = id();
        assertTrue(orderPolicy.processProjectionEvent(order(order, store)));
        var conflictingStore = payment(order, id());
        assertThrows(IllegalArgumentException.class, () -> orderPolicy.processProjectionEvent(conflictingStore));
        var corrected = order(order, store);
        ((ObjectNode) corrected.payload()).put("totalAmount", 1);
        assertThrows(IllegalArgumentException.class, () -> orderPolicy.processProjectionEvent(corrected));
        var cancelled = event(UUID.randomUUID().toString(), "order.cancelled", order, store, "2026-11-05T00:00:00Z");
        orderPolicy.handleOrderCancelled(cancelled);
        orderPolicy.handleOrderCancelled(cancelled);
        assertStats(store, "2026-11-05", 1, 120000, 120000, 0);
    }

    private void race(Runnable firstAction, Runnable secondAction) throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            var first = executor.submit(() -> { start.await(); firstAction.run(); return null; });
            var second = executor.submit(() -> { start.await(); secondAction.run(); return null; });
            start.countDown();
            first.get(20, TimeUnit.SECONDS);
            second.get(20, TimeUnit.SECONDS);
        }
    }
}
