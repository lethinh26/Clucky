package com.clucky.notificationservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(MailSenderProperties.class)
public class MailSenderConfig {

    @Bean
    public JavaMailSender javaMailSender(MailSenderProperties properties) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(properties.host() != null ? properties.host() : "smtp.gmail.com");
        mailSender.setPort(properties.port() > 0 ? properties.port() : 587);
        if (properties.username() != null) {
            mailSender.setUsername(properties.username());
        }
        if (properties.appPassword() != null) {
            mailSender.setPassword(properties.appPassword());
        }
        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.timeout", String.valueOf(properties.timeoutMs() > 0 ? properties.timeoutMs() : 8000));
        props.put("mail.smtp.connectiontimeout", String.valueOf(properties.timeoutMs() > 0 ? properties.timeoutMs() : 8000));
        return mailSender;
    }
}
