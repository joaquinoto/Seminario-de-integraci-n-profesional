package com.panstock.api.repository.jpa;

import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.enums.BatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;

public interface InventoryBatchJpaRepository extends JpaRepository<InventoryBatch, Long> {

    List<InventoryBatch> findByBatchStatusAndCurrentQuantityGreaterThan(
            BatchStatus batchStatus,
            BigDecimal quantity
    );
}