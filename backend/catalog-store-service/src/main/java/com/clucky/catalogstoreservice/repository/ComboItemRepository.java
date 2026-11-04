package com.clucky.catalogstoreservice.repository;

import com.clucky.catalogstoreservice.entity.ComboItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComboItemRepository extends JpaRepository<ComboItem, Long> {

}
