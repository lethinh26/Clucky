package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByIsActiveTrueOrderBySortOrderAscIdAsc();
    List<Category> findAllByOrderBySortOrderAscIdAsc();
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(p) FROM Product p WHERE p.category.id = :categoryId")
    long countProductsByCategoryId(@org.springframework.data.repository.query.Param("categoryId") Long categoryId);
}
