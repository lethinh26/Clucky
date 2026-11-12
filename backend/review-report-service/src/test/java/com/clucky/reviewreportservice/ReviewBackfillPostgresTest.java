package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.entity.Review;
import com.clucky.reviewreportservice.repository.ReviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringJUnitConfig(ReportProjectionPostgresTest.Config.class)
@EnabledIfEnvironmentVariable(named = "CLUCKY_TEST_DB_URL", matches = ".+")
class ReviewBackfillPostgresTest {
    @Autowired ReviewRepository reviews;
    @Autowired JpaTransactionManager manager;

    @Test
    void concurrentListAndSummaryBackfillsCannotProduceAnOptimisticConflict() throws Exception {
        var transaction = new TransactionTemplate(manager);
        long orderId = UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE;
        long reviewId = reviews.saveAndFlush(new Review(orderId, orderId, orderId, 5, "backfill regression")).getId();
        var firstRead = new CountDownLatch(1);
        var secondStarted = new CountDownLatch(1);
        var releaseFirst = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> transaction.executeWithoutResult(status -> {
                var unresolved = reviews.findByStoreIdIsNull();
                unresolved.stream().filter(review -> review.getId() == reviewId).forEach(review -> review.setStoreId(1L));
                firstRead.countDown();
                try { assertTrue(releaseFirst.await(10, TimeUnit.SECONDS)); }
                catch (InterruptedException failure) { Thread.currentThread().interrupt(); throw new IllegalStateException(failure); }
            }));
            try {
                assertTrue(firstRead.await(10, TimeUnit.SECONDS));
                var second = executor.submit(() -> transaction.executeWithoutResult(status -> {
                    secondStarted.countDown();
                    reviews.findByStoreIdIsNull().stream().filter(review -> review.getId() == reviewId)
                            .forEach(review -> review.setStoreId(1L));
                }));
                assertTrue(secondStarted.await(10, TimeUnit.SECONDS));
                assertThrows(TimeoutException.class, () -> second.get(300, TimeUnit.MILLISECONDS));
                releaseFirst.countDown();
                first.get(10, TimeUnit.SECONDS);
                second.get(10, TimeUnit.SECONDS);
                var resolved = reviews.findById(reviewId).orElseThrow();
                assertEquals(1L, resolved.getStoreId());
                assertEquals(1L, resolved.getVersion());
            } finally { releaseFirst.countDown(); }
        } finally { reviews.deleteById(reviewId); }
    }
}
