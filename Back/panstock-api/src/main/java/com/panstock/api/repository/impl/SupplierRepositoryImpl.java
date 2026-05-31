package com.panstock.api.repository.impl;

import com.panstock.api.entity.Supplier;
import com.panstock.api.enums.SupplierType;
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
    public Supplier save(Supplier supplier) {
        return supplierJpaRepository.save(supplier);
    }

    @Override
    public Optional<Supplier> findById(Long id) {
        return supplierJpaRepository.findById(id);
    }

    @Override
    public List<Supplier> findAll() {
        return supplierJpaRepository.findAllByOrderByNameAsc();
    }

    @Override
    public List<Supplier> findActive() {
        return supplierJpaRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    public List<Supplier> findActiveBySupplierType(SupplierType supplierType) {
        return supplierJpaRepository.findByActiveTrueAndSupplierTypeOrderByNameAsc(supplierType);
    }

    @Override
    public boolean existsByNameIgnoreCase(String name) {
        return supplierJpaRepository.existsByNameIgnoreCase(name);
    }

    @Override
    public boolean existsByNameIgnoreCaseAndIdNot(String name, Long id) {
        return supplierJpaRepository.existsByNameIgnoreCaseAndIdNot(name, id);
    }
}