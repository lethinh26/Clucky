package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    List<Store> findByStatus(String status);
}
