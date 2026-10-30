package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.id = :id")
    Optional<Product> findByIdWithCategory(@Param("id") Long id);

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category WHERE p.isActive = true")
    List<Product> findAllActive();

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category " +
           "WHERE (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:spicyLevel IS NULL OR p.spicyLevel = :spicyLevel) " +
           "AND (:activeOnly IS FALSE OR p.isActive = true)")
    List<Product> searchWithoutKeyword(@Param("categoryId") Long categoryId,
                                       @Param("spicyLevel") Integer spicyLevel,
                                       @Param("activeOnly") boolean activeOnly);

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category " +
           "WHERE (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:spicyLevel IS NULL OR p.spicyLevel = :spicyLevel) " +
           "AND (:activeOnly IS FALSE OR p.isActive = true) " +
           "AND (LOWER(p.name) LIKE :pattern OR LOWER(p.description) LIKE :pattern)")
    List<Product> searchWithKeyword(@Param("categoryId") Long categoryId,
                                    @Param("pattern") String pattern,
                                    @Param("spicyLevel") Integer spicyLevel,
                                    @Param("activeOnly") boolean activeOnly);
}
