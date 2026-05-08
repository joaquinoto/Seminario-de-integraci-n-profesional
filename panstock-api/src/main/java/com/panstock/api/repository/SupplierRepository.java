package com.panstock.api.repository;

import com.panstock.api.entity.Supplier;

import java.util.List;
import java.util.Optional;

public interface SupplierRepository {

    Optional<Supplier> findById(Long id);

    List<Supplier> findActive();

    Supplier save(Supplier supplier);
}