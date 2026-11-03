package com.clucky.cartorderservice.logging;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.header.Headers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.listener.RecordInterceptor;
import org.springframework.kafka.support.ProducerListener;
import org.springframework.stereotype.Component;
import org.springframework.context.event.EventListener;
import org.springframework.kafka.event.ConsumerStoppedEvent;

@Component
public class KafkaLogging implements RecordInterceptor<Object, Object>, ProducerListener<Object, Object> {
    private static final Logger LOG = LoggerFactory.getLogger(KafkaLogging.class);
    private final ThreadLocal<SavedContext> context = new ThreadLocal<>();
    private record SavedContext(Map<String, String> values, long started) {}

    public static String header(Headers headers, String name) {
        var header = headers.lastHeader(name);
        if (header == null || header.value() == null || header.value().length > 160) { return "unknown"; }
        return SafeLog.token(new String(header.value(), StandardCharsets.UTF_8));
    }

    @Override
    public ConsumerRecord<Object, Object> intercept(ConsumerRecord<Object, Object> record,
            Consumer<Object, Object> consumer) {
        restore();
        context.set(new SavedContext(MDC.getCopyOfContextMap(), System.nanoTime()));
        MDC.put("correlationId", header(record.headers(), "X-Correlation-ID"));
        MDC.put("eventId", header(record.headers(), "X-Event-ID"));
        return record;
    }

    @Override
    public void success(ConsumerRecord<Object, Object> record, Consumer<Object, Object> consumer) {
        SavedContext saved = context.get();
        LOG.info("event=kafka_listener_returned correlationId={} eventId={} topic={} partition={} offset={} durationMs={}",
                header(record.headers(), "X-Correlation-ID"), header(record.headers(), "X-Event-ID"),
                SafeLog.token(record.topic()), record.partition(), record.offset(),
                saved == null ? 0 : (System.nanoTime() - saved.started()) / 1_000_000);
    }

    @Override
    public void afterRecord(ConsumerRecord<Object, Object> record, Consumer<Object, Object> consumer) { restore(); }

    @Override
    public void clearThreadState(Consumer<?, ?> consumer) { restore(); }

    private void restore() {
        SavedContext saved = context.get();
        if (saved == null) { return; }
        if (saved.values() == null) { MDC.clear(); }
        else { MDC.setContextMap(saved.values()); }
        context.remove();
    }

    @EventListener
    public void consumerStopped(ConsumerStoppedEvent event) {
        LOG.warn("event=kafka_consumer_stopped reason={}", event.getReason().name());
    }

    public static void failedDelivery(ConsumerRecord<?, ?> record, Exception failure, int attempt) {
        LOG.warn("event=kafka_delivery_failed correlationId={} eventId={} topic={} partition={} offset={} attempt={} trace={}",
                header(record.headers(), "X-Correlation-ID"), header(record.headers(), "X-Event-ID"),
                SafeLog.token(record.topic()), record.partition(), record.offset(), attempt, SafeLog.trace(failure));
    }

    @Override
    public void onSuccess(ProducerRecord<Object, Object> record, RecordMetadata metadata) {
        LOG.info("event=kafka_broker_acked correlationId={} eventId={} topic={} partition={} offset={}",
                header(record.headers(), "X-Correlation-ID"), header(record.headers(), "X-Event-ID"),
                SafeLog.token(record.topic()), metadata.partition(), metadata.offset());
    }

    @Override
    public void onError(ProducerRecord<Object, Object> record, RecordMetadata metadata, Exception failure) {
        LOG.error("event=kafka_send_failed correlationId={} eventId={} topic={} trace={}",
                header(record.headers(), "X-Correlation-ID"), header(record.headers(), "X-Event-ID"),
                SafeLog.token(record.topic()), SafeLog.trace(failure));
    }
}
