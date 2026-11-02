package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.ProductOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductOptionRepository extends JpaRepository<ProductOption, Long> {

}
