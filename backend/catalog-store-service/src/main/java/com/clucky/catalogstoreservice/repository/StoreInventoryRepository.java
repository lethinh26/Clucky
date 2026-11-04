package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.StoreInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StoreInventoryRepository extends JpaRepository<StoreInventory, Long> {
    Optional<StoreInventory> findByIdAndStoreId(Long id, Long storeId);
}
