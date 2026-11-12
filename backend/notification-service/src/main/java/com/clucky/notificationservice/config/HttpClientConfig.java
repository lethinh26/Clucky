package com.clucky.notificationservice.config;

import org.slf4j.MDC;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class HttpClientConfig {
    @Bean
    @org.springframework.cloud.client.loadbalancer.LoadBalanced
    org.springframework.web.client.RestClient.Builder serviceRestClientBuilder(
            org.springframework.boot.autoconfigure.web.client.RestClientBuilderConfigurer configurer) {
        return configurer.configure(org.springframework.web.client.RestClient.builder());
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
