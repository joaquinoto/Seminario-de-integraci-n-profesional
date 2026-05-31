package com.panstock.api.repository.jpa;

import com.panstock.api.entity.Supplier;
import com.panstock.api.enums.SupplierType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierJpaRepository extends JpaRepository<Supplier, Long> {

    List<Supplier> findAllByOrderByNameAsc();

    List<Supplier> findByActiveTrueOrderByNameAsc();

    List<Supplier> findByActiveTrueAndSupplierTypeOrderByNameAsc(SupplierType supplierType);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}