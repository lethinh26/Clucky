package com.clucky.catalogstoreservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(CloudinaryProperties.class)
public class CloudinaryConfig {}
