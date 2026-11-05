package com.clucky.cartorderservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CartOrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CartOrderServiceApplication.class, args);
    }
}
