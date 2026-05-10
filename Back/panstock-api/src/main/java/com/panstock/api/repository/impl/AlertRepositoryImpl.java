package com.panstock.api.repository.impl;

import com.panstock.api.entity.Alert;
import com.panstock.api.enums.AlertStatus;
import com.panstock.api.enums.AlertType;
import com.panstock.api.repository.AlertRepository;
import com.panstock.api.repository.jpa.AlertJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AlertRepositoryImpl implements AlertRepository {

    private final AlertJpaRepository alertJpaRepository;

    @Override
    public Alert save(Alert alert) {
        return alertJpaRepository.save(alert);
    }

    @Override
    public Optional<Alert> findById(Long id) {
        return alertJpaRepository.findById(id);
    }

    @Override
    public List<Alert> findAll() {
        return alertJpaRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    public List<Alert> findActive() {
        return alertJpaRepository.findByStatusOrderByCreatedAtDesc(AlertStatus.ACTIVE);
    }

    @Override
    public boolean existsActiveByAlertTypeAndBatchId(AlertType alertType, Long batchId) {
        return alertJpaRepository.existsByAlertTypeAndBatchIdAndStatus(
                alertType,
                batchId,
                AlertStatus.ACTIVE
        );
    }

    @Override
    public boolean existsActiveByAlertTypeAndProductId(AlertType alertType, Long productId) {
        return alertJpaRepository.existsByAlertTypeAndProductIdAndStatus(
                alertType,
                productId,
                AlertStatus.ACTIVE
        );
    }
}