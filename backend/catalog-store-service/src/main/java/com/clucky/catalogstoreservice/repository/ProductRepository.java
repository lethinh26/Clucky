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

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category LEFT JOIN FETCH p.options LEFT JOIN FETCH p.toppings WHERE p.id = :id")
    Optional<Product> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category WHERE p.isActive = true")
    List<Product> findAllActive();

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category " +
           "WHERE (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:spicyLevel IS NULL OR p.spicyLevel = :spicyLevel) " +
           "AND (:activeOnly IS FALSE OR p.isActive = true)")
    List<Product> searchProducts(@Param("categoryId") Long categoryId,
                                 @Param("keyword") String keyword,
                                 @Param("spicyLevel") Integer spicyLevel,
                                 @Param("activeOnly") boolean activeOnly);
}
