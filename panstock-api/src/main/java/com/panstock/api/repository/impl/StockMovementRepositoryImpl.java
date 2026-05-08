package com.panstock.api.repository.impl;

import com.panstock.api.entity.StockMovement;
import com.panstock.api.enums.StockMovementType;
import com.panstock.api.repository.StockMovementRepository;
import com.panstock.api.repository.jpa.StockMovementJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class StockMovementRepositoryImpl implements StockMovementRepository {

    private final StockMovementJpaRepository stockMovementJpaRepository;

    @Override
    public StockMovement save(StockMovement stockMovement) {
        return stockMovementJpaRepository.save(stockMovement);
    }

    @Override
    public Optional<StockMovement> findById(Long id) {
        return stockMovementJpaRepository.findById(id);
    }

    @Override
    public List<StockMovement> findAll() {
        return stockMovementJpaRepository.findAllByOrderByMovementDateDesc();
    }

    @Override
    public List<StockMovement> search(
            Long productId,
            Long batchId,
            StockMovementType movementType,
            LocalDateTime from,
            LocalDateTime to
    ) {
        return stockMovementJpaRepository.search(
                productId,
                batchId,
                movementType,
                from,
                to
        );
    }
}