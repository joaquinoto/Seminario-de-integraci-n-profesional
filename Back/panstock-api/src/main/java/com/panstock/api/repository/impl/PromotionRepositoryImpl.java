package com.panstock.api.repository.impl;

import com.panstock.api.entity.Promotion;
import com.panstock.api.enums.PromotionStatus;
import com.panstock.api.repository.PromotionRepository;
import com.panstock.api.repository.jpa.PromotionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class PromotionRepositoryImpl implements PromotionRepository {

    private final PromotionJpaRepository promotionJpaRepository;

    @Override
    public Promotion save(Promotion promotion) {
        return promotionJpaRepository.save(promotion);
    }

    @Override
    public Optional<Promotion> findById(Long id) {
        return promotionJpaRepository.findById(id);
    }

    @Override
    public List<Promotion> findAll() {
        return promotionJpaRepository.findAllByOrderByStartDateDesc();
    }

    @Override
    public List<Promotion> findActive() {
        return promotionJpaRepository.findByStatusAndEndDateGreaterThanEqualOrderByEndDateAsc(
                PromotionStatus.ACTIVE,
                LocalDateTime.now()
        );
    }

    @Override
    public boolean existsActiveByBatchId(Long batchId) {
        // CORREGIDO: usa el método con batch_Id en lugar de batchId
        return promotionJpaRepository.existsByBatch_IdAndStatusAndEndDateGreaterThanEqual(
                batchId,
                PromotionStatus.ACTIVE,
                LocalDateTime.now()
        );
    }
}