package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.StoreProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StoreProductRepository extends JpaRepository<StoreProduct, Long> {
    Optional<StoreProduct> findByIdAndStoreId(Long id, Long storeId);
}
