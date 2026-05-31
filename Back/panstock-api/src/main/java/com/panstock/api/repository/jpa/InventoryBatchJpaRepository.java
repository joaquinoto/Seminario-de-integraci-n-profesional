package com.panstock.api.repository.jpa;

import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.enums.BatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryBatchJpaRepository extends JpaRepository<InventoryBatch, Long> {

    List<InventoryBatch> findByBatchStatusAndCurrentQuantityGreaterThan(
            BatchStatus batchStatus,
            java.math.BigDecimal currentQuantity
    );

    @Query("""
            SELECT b
            FROM InventoryBatch b
            WHERE b.product.id = :productId
              AND b.currentQuantity > 0
              AND b.batchStatus = :batchStatus
              AND (b.expirationDate IS NULL OR b.expirationDate >= CURRENT_DATE)
            ORDER BY
              CASE WHEN b.expirationDate IS NULL THEN 1 ELSE 0 END,
              b.expirationDate ASC,
              b.receivedDate ASC,
              b.id ASC
            """)
    List<InventoryBatch> findSellableByProductId(
            @Param("productId") Long productId,
            @Param("batchStatus") BatchStatus batchStatus
    );
}