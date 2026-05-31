package com.panstock.api.repository;

import com.panstock.api.entity.InventoryBatch;

import java.util.List;
import java.util.Optional;

public interface InventoryBatchRepository {

    InventoryBatch save(InventoryBatch batch);

    Optional<InventoryBatch> findById(Long id);

    List<InventoryBatch> findAll();

    List<InventoryBatch> findAvailableWithStock();

    List<InventoryBatch> findSellableByProductId(Long productId);
}