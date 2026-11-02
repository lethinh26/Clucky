package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {

}
