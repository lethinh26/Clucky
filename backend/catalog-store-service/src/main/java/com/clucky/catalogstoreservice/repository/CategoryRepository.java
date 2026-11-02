package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

}
