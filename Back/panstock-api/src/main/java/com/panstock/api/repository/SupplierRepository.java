package com.panstock.api.repository;

import com.panstock.api.entity.Supplier;
import com.panstock.api.enums.SupplierType;

import java.util.List;
import java.util.Optional;

public interface SupplierRepository {

    Supplier save(Supplier supplier);

    Optional<Supplier> findById(Long id);

    List<Supplier> findAll();

    List<Supplier> findActive();

    List<Supplier> findActiveBySupplierType(SupplierType supplierType);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}