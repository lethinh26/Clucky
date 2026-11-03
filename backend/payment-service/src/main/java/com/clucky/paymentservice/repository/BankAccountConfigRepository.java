package com.clucky.paymentservice.repository;

import com.clucky.paymentservice.entity.BankAccountConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankAccountConfigRepository extends JpaRepository<BankAccountConfig, Long> {

}
