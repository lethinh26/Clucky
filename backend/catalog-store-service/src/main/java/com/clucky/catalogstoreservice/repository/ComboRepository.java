package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.Combo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComboRepository extends JpaRepository<Combo, Long> {

    @Query("SELECT DISTINCT c FROM Combo c LEFT JOIN FETCH c.items i LEFT JOIN FETCH i.product WHERE c.id = :id")
    Optional<Combo> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT DISTINCT c FROM Combo c LEFT JOIN FETCH c.items i LEFT JOIN FETCH i.product WHERE c.isActive = true")
    List<Combo> findAllActiveWithItems();

    @Query("SELECT DISTINCT c FROM Combo c LEFT JOIN FETCH c.items i LEFT JOIN FETCH i.product")
    List<Combo> findAllWithItems();
}
