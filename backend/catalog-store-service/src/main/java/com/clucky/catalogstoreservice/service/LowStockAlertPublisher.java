package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.DomainEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.UUID;

@Component
public class LowStockAlertPublisher {
    private static final Logger LOG = LoggerFactory.getLogger(LowStockAlertPublisher.class);
    private static final String TOPIC = "inventory.low-stock";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final BranchProvisioning branchProvisioning;

    public LowStockAlertPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            BranchProvisioning branchProvisioning
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.branchProvisioning = branchProvisioning;
    }

    public void publishLowStockAlert(Long storeId, Long productId, String productName, int quantity, int threshold, String episodeId) {
        try {
            Long managerUserId = null;
            try {
                var status = branchProvisioning.status(storeId);
                if (status != null && status.containsKey("accounts")) {
                    Object accountsObj = status.get("accounts");
                    if (accountsObj instanceof java.util.List<?> list) {
                        for (Object acc : list) {
                            if (acc instanceof java.util.Map<?, ?> map) {
                                if ("STORE_MANAGER".equals(map.get("role"))) {
                                    Object idObj = map.get("id");
                                    if (idObj instanceof Number num) {
                                        managerUserId = num.longValue();
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception ex) {
                LOG.warn("event=manager_lookup_failed storeId={} error={}", storeId, ex.getMessage());
            }

            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("storeId", storeId);
            payload.put("productId", productId);
            payload.put("productName", productName != null ? productName : "Sản phẩm");
            payload.put("quantity", quantity);
            payload.put("threshold", threshold);
            payload.put("episodeId", episodeId);
            if (managerUserId != null) {
                payload.put("managerUserId", managerUserId);
            }

            String eventId = UUID.randomUUID().toString();
            String correlationId = UUID.randomUUID().toString();

            DomainEvent event = new DomainEvent(
                    eventId,
                    correlationId,
                    TOPIC,
                    "catalog-store-service",
                    Instant.now(),
                    payload
            );

            String message = objectMapper.writeValueAsString(event);

            if (TransactionSynchronizationManager.isActualTransactionActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        try {
                            kafkaTemplate.send(TOPIC, String.valueOf(storeId), message);
                            LOG.info("event=low_stock_alert_published eventId={} storeId={} productId={} episodeId={}",
                                    eventId, storeId, productId, episodeId);
                        } catch (Exception ex) {
                            LOG.error("event=low_stock_kafka_publish_failed eventId={} error={}", eventId, ex.getMessage());
                        }
                    }
                });
            } else {
                kafkaTemplate.send(TOPIC, String.valueOf(storeId), message);
                LOG.info("event=low_stock_alert_published_immediate eventId={} storeId={} productId={}", eventId, storeId, productId);
            }
        } catch (Exception ex) {
            LOG.error("event=low_stock_alert_preparation_failed storeId={} productId={} error={}", storeId, productId, ex.getMessage());
        }
    }
}

