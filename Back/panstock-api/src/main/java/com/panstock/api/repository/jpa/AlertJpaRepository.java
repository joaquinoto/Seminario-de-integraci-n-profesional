package com.panstock.api.repository.jpa;

import com.panstock.api.entity.Alert;
import com.panstock.api.enums.AlertStatus;
import com.panstock.api.enums.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertJpaRepository extends JpaRepository<Alert, Long> {

    List<Alert> findAllByOrderByCreatedAtDesc();

    List<Alert> findByStatusOrderByCreatedAtDesc(AlertStatus status);

    boolean existsByAlertTypeAndBatchIdAndStatus(
            AlertType alertType,
            Long batchId,
            AlertStatus status
    );

    boolean existsByAlertTypeAndProductIdAndStatus(
            AlertType alertType,
            Long productId,
            AlertStatus status
    );
}