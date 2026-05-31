package com.panstock.api.repository;

import com.panstock.api.entity.StockMovement;
import com.panstock.api.enums.StockMovementType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StockMovementRepository {

    StockMovement save(StockMovement stockMovement);

    Optional<StockMovement> findById(Long id);

    List<StockMovement> findAll();

    List<StockMovement> search(
            Long productId,
            Long batchId,
            StockMovementType movementType,
            LocalDateTime from,
            LocalDateTime to
    );
}