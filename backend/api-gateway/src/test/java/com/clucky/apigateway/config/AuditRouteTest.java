package com.clucky.apigateway.config;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.cloud.gateway.config.GatewayProperties;
import org.springframework.cloud.gateway.handler.predicate.PathRoutePredicateFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

import static org.junit.jupiter.api.Assertions.*;

class AuditRouteTest {
    @Test
    void auditListAndExportReachTheSameService() throws Exception {
        Path configuration = Stream.of("../../config-repo/api-gateway.yml", "../config-repo/api-gateway.yml", "config-repo/api-gateway.yml")
                .map(Path::of).filter(Files::isRegularFile).findFirst().orElseThrow();
        var source = new YamlPropertySourceLoader().load("gateway", new FileSystemResource(configuration)).getFirst();
        var properties = new Binder(ConfigurationPropertySources.from(source))
                .bind("spring.cloud.gateway", Bindable.of(GatewayProperties.class)).get();
        var route = properties.getRoutes().stream().filter(candidate -> "audit".equals(candidate.getId())).findFirst().orElseThrow();
        assertEquals(URI.create("lb://AUDIT-SERVICE"), route.getUri());
        var definition = route.getPredicates().stream().filter(candidate -> "Path".equals(candidate.getName())).findFirst().orElseThrow();
        var config = new PathRoutePredicateFactory.Config();
        config.setPatterns(List.copyOf(definition.getArgs().values()));
        var predicate = new PathRoutePredicateFactory().apply(config);
        for (String path : List.of("/api/audit-logs", "/api/audit-logs/export", "/api/audit-logs/export?sourceService=identity-service")) {
            assertTrue(predicate.test(MockServerWebExchange.from(MockServerHttpRequest.get(path))), path);
        }
        assertFalse(predicate.test(MockServerWebExchange.from(MockServerHttpRequest.get("/api/audit-logs-other"))));
    }
}
