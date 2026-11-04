package com.clucky.reviewreportservice.config;

import org.slf4j.MDC;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration(proxyBeanMethods = false)
public class HttpClientConfig {
    @Bean
    @LoadBalanced
    RestTemplate orderRestTemplate(RestTemplateBuilder builder) {
        return builder.connectTimeout(Duration.ofSeconds(2)).readTimeout(Duration.ofSeconds(3))
                .additionalInterceptors((request, body, execution) -> {
                    String correlationId = MDC.get("correlationId");
                    if (correlationId != null && correlationId.matches("[A-Za-z0-9._-]{1,128}")) {
                        request.getHeaders().set(CorrelationIdFilter.HEADER, correlationId);
                    }
                    return execution.execute(request, body);
                }).build();
    }

    @Bean
    RestClientCustomizer correlationIdCustomizer() {
        return builder -> builder.requestInterceptor((request, body, execution) -> {
            String correlationId = MDC.get("correlationId");
            if (correlationId != null && correlationId.matches("[A-Za-z0-9._-]{1,128}")) {
                request.getHeaders().set(CorrelationIdFilter.HEADER, correlationId);
            }
            return execution.execute(request, body);
        });
    }
}
