package com.panstock.api.repository;

import com.panstock.api.entity.StockMovement;

public interface StockMovementRepository {

    StockMovement save(StockMovement movement);
}