package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.StoreProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreProductRepository extends JpaRepository<StoreProduct, Long> {

    Optional<StoreProduct> findByStoreIdAndProductId(Long storeId, Long productId);

    @Query("SELECT sp FROM StoreProduct sp JOIN FETCH sp.product p WHERE sp.store.id = :storeId")
    List<StoreProduct> findByStoreIdWithProduct(@Param("storeId") Long storeId);

    List<StoreProduct> findByStoreId(Long storeId);

    void deleteByProductId(Long productId);
    void deleteByStoreId(Long storeId);
}
