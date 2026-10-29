package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.StoreInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreInventoryRepository extends JpaRepository<StoreInventory, Long> {

    Optional<StoreInventory> findByStoreIdAndProductId(Long storeId, Long productId);

    @Query("SELECT si FROM StoreInventory si JOIN FETCH si.product p JOIN FETCH p.category WHERE si.store.id = :storeId")
    List<StoreInventory> findByStoreIdWithProductAndCategory(@Param("storeId") Long storeId);

    List<StoreInventory> findByStoreId(Long storeId);

    void deleteByProductId(Long productId);
    void deleteByStoreId(Long storeId);
}
