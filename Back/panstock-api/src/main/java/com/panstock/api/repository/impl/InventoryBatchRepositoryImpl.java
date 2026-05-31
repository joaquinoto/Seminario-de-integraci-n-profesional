package com.panstock.api.repository.impl;

import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.enums.BatchStatus;
import com.panstock.api.repository.InventoryBatchRepository;
import com.panstock.api.repository.jpa.InventoryBatchJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class InventoryBatchRepositoryImpl implements InventoryBatchRepository {

    private final InventoryBatchJpaRepository inventoryBatchJpaRepository;

    @Override
    public InventoryBatch save(InventoryBatch batch) {
        return inventoryBatchJpaRepository.save(batch);
    }

    @Override
    public Optional<InventoryBatch> findById(Long id) {
        return inventoryBatchJpaRepository.findById(id);
    }

    @Override
    public List<InventoryBatch> findAll() {
        return inventoryBatchJpaRepository.findAll();
    }

    @Override
    public List<InventoryBatch> findAvailableWithStock() {
        return inventoryBatchJpaRepository.findByBatchStatusAndCurrentQuantityGreaterThan(
                BatchStatus.AVAILABLE,
                BigDecimal.ZERO
        );
    }

    @Override
    public List<InventoryBatch> findSellableByProductId(Long productId) {
        return inventoryBatchJpaRepository.findSellableByProductId(
                productId,
                BatchStatus.AVAILABLE
        );
    }
}