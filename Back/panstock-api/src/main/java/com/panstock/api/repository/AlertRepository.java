package com.panstock.api.repository;

import com.panstock.api.entity.Alert;
import com.panstock.api.enums.AlertType;

import java.util.List;
import java.util.Optional;

public interface AlertRepository {

    Alert save(Alert alert);

    Optional<Alert> findById(Long id);

    List<Alert> findAll();

    List<Alert> findActive();

    boolean existsActiveByAlertTypeAndBatchId(AlertType alertType, Long batchId);

    boolean existsActiveByAlertTypeAndProductId(AlertType alertType, Long productId);
}