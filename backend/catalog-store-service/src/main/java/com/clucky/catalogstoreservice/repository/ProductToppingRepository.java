package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.ProductTopping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductToppingRepository extends JpaRepository<ProductTopping, Long> {
    List<ProductTopping> findByProductId(Long productId);
    void deleteByProductId(Long productId);
}
