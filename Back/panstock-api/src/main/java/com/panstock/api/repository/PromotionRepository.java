package com.panstock.api.repository;

import com.panstock.api.entity.Promotion;

import java.util.List;
import java.util.Optional;

public interface PromotionRepository {

    Promotion save(Promotion promotion);

    Optional<Promotion> findById(Long id);

    List<Promotion> findAll();

    List<Promotion> findActive();

    boolean existsActiveByBatchId(Long batchId);
}