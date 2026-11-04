package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.ProductTopping;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductToppingRepository extends JpaRepository<ProductTopping, Long> {

}
