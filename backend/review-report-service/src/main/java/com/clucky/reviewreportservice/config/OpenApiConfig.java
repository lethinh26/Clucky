package com.clucky.reviewreportservice.config;

import com.clucky.reviewreportservice.dto.*;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {
    @Bean
    OpenAPI openAPI(@Value("${spring.application.name}") String serviceName) {
        Components components = new Components().addSecuritySchemes("bearerAuth", new SecurityScheme()
                .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT"));
        for (Class<?> contract : new Class<?>[] {ApiError.class, PageResponse.class, DomainEvent.class}) {
            ModelConverters.getInstance().readAll(contract).forEach(components::addSchemas);
        }
        return new OpenAPI().info(new Info().title("Clucky " + serviceName).version("v1"))
                .components(components)
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
