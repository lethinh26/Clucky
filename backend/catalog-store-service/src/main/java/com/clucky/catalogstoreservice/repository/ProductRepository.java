package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

}
