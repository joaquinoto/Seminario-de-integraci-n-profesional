package com.panstock.api.repository.jpa;

import com.panstock.api.entity.Promotion;
import com.panstock.api.enums.PromotionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PromotionJpaRepository extends JpaRepository<Promotion, Long> {

    List<Promotion> findAllByOrderByStartDateDesc();

    List<Promotion> findByStatusAndEndDateGreaterThanEqualOrderByEndDateAsc(
            PromotionStatus status,
            LocalDateTime now
    );

    // CORREGIDO: batch es @ManyToOne, se navega con batch_Id
    boolean existsByBatch_IdAndStatusAndEndDateGreaterThanEqual(
            Long batchId,
            PromotionStatus status,
            LocalDateTime now
    );
}