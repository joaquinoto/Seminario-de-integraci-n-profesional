package com.panstock.api.repository.jpa;

import com.panstock.api.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementJpaRepository extends JpaRepository<StockMovement, Long> {
}