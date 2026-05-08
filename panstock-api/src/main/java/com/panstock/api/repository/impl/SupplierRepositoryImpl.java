package com.panstock.api.repository.impl;

import com.panstock.api.entity.Supplier;
import com.panstock.api.repository.SupplierRepository;
import com.panstock.api.repository.jpa.SupplierJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class SupplierRepositoryImpl implements SupplierRepository {

    private final SupplierJpaRepository supplierJpaRepository;

    @Override
    public Optional<Supplier> findById(Long id) {
        return supplierJpaRepository.findById(id);
    }

    @Override
    public List<Supplier> findActive() {
        return supplierJpaRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    public Supplier save(Supplier supplier) {
        return supplierJpaRepository.save(supplier);
    }
}