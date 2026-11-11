package com.clucky.cartorderservice.repository;
import com.clucky.cartorderservice.entity.ConsumedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ConsumedEventRepository extends JpaRepository<ConsumedEvent, String> { }
