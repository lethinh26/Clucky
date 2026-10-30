package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.ProductOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductOptionRepository extends JpaRepository<ProductOption, Long> {
    List<ProductOption> findByProductId(Long productId);
    void deleteByProductId(Long productId);
}
