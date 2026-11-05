package com.clucky.cartorderservice.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.web.client.RestClientBuilderConfigurer;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;

class HttpClientConfigTest {
    @Test
    void serviceBuilderUsesDiscoveryAndCreatesAnIndependentClient() throws Exception {
        var method = HttpClientConfig.class.getDeclaredMethod("serviceRestClientBuilder", RestClientBuilderConfigurer.class);
        assertNotNull(method.getAnnotation(LoadBalanced.class));
        var configuration = new HttpClientConfig();
        var builder = configuration.serviceRestClientBuilder(new RestClientBuilderConfigurer());
        assertNotNull(configuration.restClient(builder));
    }
}
