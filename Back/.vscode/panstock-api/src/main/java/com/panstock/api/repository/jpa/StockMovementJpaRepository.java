package com.panstock.api.repository.jpa;

import com.panstock.api.entity.StockMovement;
import com.panstock.api.enums.StockMovementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StockMovementJpaRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findAllByOrderByMovementDateDesc();

    @Query("""
            SELECT m
            FROM StockMovement m
            LEFT JOIN m.product p
            LEFT JOIN m.batch b
            WHERE (:productId IS NULL OR p.id = :productId)
              AND (:batchId IS NULL OR b.id = :batchId)
              AND (:movementType IS NULL OR m.movementType = :movementType)
              AND (:from IS NULL OR m.movementDate >= :from)
              AND (:to IS NULL OR m.movementDate <= :to)
            ORDER BY m.movementDate DESC
            """)
    List<StockMovement> search(
            @Param("productId") Long productId,
            @Param("batchId") Long batchId,
            @Param("movementType") StockMovementType movementType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}