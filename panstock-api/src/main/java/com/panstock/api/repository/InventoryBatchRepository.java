package com.panstock.api.repository;

import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.enums.BatchStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface InventoryBatchRepository {

    InventoryBatch save(InventoryBatch batch);

    Optional<InventoryBatch> findById(Long id);

    List<InventoryBatch> findAll();

    List<InventoryBatch> findAvailableWithStock();
}