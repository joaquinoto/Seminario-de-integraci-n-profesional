package com.panstock.api.repository.impl;

import com.panstock.api.entity.StockMovement;
import com.panstock.api.repository.StockMovementRepository;
import com.panstock.api.repository.jpa.StockMovementJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class StockMovementRepositoryImpl implements StockMovementRepository {

    private final StockMovementJpaRepository stockMovementJpaRepository;

    @Override
    public StockMovement save(StockMovement movement) {
        return stockMovementJpaRepository.save(movement);
    }
}