package com.panstock.api.service.impl;

import com.panstock.api.dto.response.AlertGenerationResponse;
import com.panstock.api.dto.response.AlertResponse;
import com.panstock.api.entity.Alert;
import com.panstock.api.entity.AppSetting;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;
import com.panstock.api.enums.AlertSeverity;
import com.panstock.api.enums.AlertStatus;
import com.panstock.api.enums.AlertType;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.AlertMapper;
import com.panstock.api.repository.AlertRepository;
import com.panstock.api.repository.AppSettingRepository;
import com.panstock.api.repository.InventoryBatchRepository;
import com.panstock.api.repository.ProductRepository;
import com.panstock.api.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class AlertServiceImpl implements AlertService {

    private static final String EXPIRATION_ALERT_DAYS_KEY = "expiration_alert_days";
    private static final int DEFAULT_EXPIRATION_ALERT_DAYS = 2;

    private final AlertRepository alertRepository;
    private final ProductRepository productRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final AppSettingRepository appSettingRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> findAll() {
        return alertRepository.findAll()
                .stream()
                .map(AlertMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> findActive() {
        return alertRepository.findActive()
                .stream()
                .map(AlertMapper::toResponse)
                .toList();
    }

    @Override
    public AlertGenerationResponse generateAlerts() {
        List<Alert> createdAlerts = new java.util.ArrayList<>();

        createdAlerts.addAll(generateExpirationAlerts());
        createdAlerts.addAll(generateLowStockAlerts());

        return new AlertGenerationResponse(
                createdAlerts.size(),
                createdAlerts.stream()
                        .map(AlertMapper::toResponse)
                        .toList()
        );
    }

    @Override
    public AlertResponse resolve(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta no encontrada con id " + id));

        if (alert.getStatus() == AlertStatus.RESOLVED) {
            throw new BadRequestException("La alerta ya se encuentra resuelta.");
        }

        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());

        Alert saved = alertRepository.save(alert);

        return AlertMapper.toResponse(saved);
    }

    private List<Alert> generateExpirationAlerts() {
        int alertDays = getExpirationAlertDays();
        LocalDate today = LocalDate.now();

        List<Alert> createdAlerts = new java.util.ArrayList<>();

        List<InventoryBatch> batches = inventoryBatchRepository.findAll();

        for (InventoryBatch batch : batches) {
            if (batch.getExpirationDate() == null) {
                continue;
            }

            if (batch.getCurrentQuantity() == null || batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            long daysToExpire = ChronoUnit.DAYS.between(today, batch.getExpirationDate());

            if (daysToExpire < 0) {
                Alert alert = createAlertIfNotExists(
                        AlertType.EXPIRED,
                        batch.getProduct(),
                        batch,
                        batch.getProduct().getName() + " ya venció.",
                        AlertSeverity.RED
                );

                if (alert != null) {
                    createdAlerts.add(alert);
                }

                continue;
            }

            if (daysToExpire <= alertDays) {
                AlertSeverity severity = daysToExpire == 0
                        ? AlertSeverity.RED
                        : AlertSeverity.YELLOW;

                String message = daysToExpire == 0
                        ? batch.getProduct().getName() + " vence hoy."
                        : batch.getProduct().getName() + " vence dentro de " + daysToExpire + " día(s).";

                Alert alert = createAlertIfNotExists(
                        AlertType.EXPIRING_SOON,
                        batch.getProduct(),
                        batch,
                        message,
                        severity
                );

                if (alert != null) {
                    createdAlerts.add(alert);
                }
            }
        }

        return createdAlerts;
    }

    private List<Alert> generateLowStockAlerts() {
        List<Alert> createdAlerts = new java.util.ArrayList<>();

        List<Product> activeProducts = productRepository.findActive();
        List<InventoryBatch> availableBatches = inventoryBatchRepository.findAvailableWithStock();

        Map<Long, BigDecimal> stockByProduct = new LinkedHashMap<>();

        for (InventoryBatch batch : availableBatches) {
            Long productId = batch.getProduct().getId();

            stockByProduct.putIfAbsent(productId, BigDecimal.ZERO);
            stockByProduct.put(
                    productId,
                    stockByProduct.get(productId).add(batch.getCurrentQuantity())
            );
        }

        for (Product product : activeProducts) {
            if (product.getMinimumStock() == null) {
                continue;
            }

            BigDecimal currentStock = stockByProduct.getOrDefault(product.getId(), BigDecimal.ZERO);

            if (currentStock.compareTo(product.getMinimumStock()) < 0) {
                String message = product.getName()
                        + " está por debajo del stock mínimo. Stock actual: "
                        + currentStock
                        + ", mínimo: "
                        + product.getMinimumStock()
                        + ".";

                Alert alert = createLowStockAlertIfNotExists(product, message);

                if (alert != null) {
                    createdAlerts.add(alert);
                }
            }
        }

        return createdAlerts;
    }

    private Alert createAlertIfNotExists(
            AlertType alertType,
            Product product,
            InventoryBatch batch,
            String message,
            AlertSeverity severity
    ) {
        if (alertRepository.existsActiveByAlertTypeAndBatchId(alertType, batch.getId())) {
            return null;
        }

        Alert alert = new Alert();
        alert.setAlertType(alertType);
        alert.setProduct(product);
        alert.setBatch(batch);
        alert.setMessage(message);
        alert.setSeverity(severity);
        alert.setStatus(AlertStatus.ACTIVE);

        return alertRepository.save(alert);
    }

    private Alert createLowStockAlertIfNotExists(Product product, String message) {
        if (alertRepository.existsActiveByAlertTypeAndProductId(AlertType.LOW_STOCK, product.getId())) {
            return null;
        }

        Alert alert = new Alert();
        alert.setAlertType(AlertType.LOW_STOCK);
        alert.setProduct(product);
        alert.setBatch(null);
        alert.setMessage(message);
        alert.setSeverity(AlertSeverity.YELLOW);
        alert.setStatus(AlertStatus.ACTIVE);

        return alertRepository.save(alert);
    }

    private int getExpirationAlertDays() {
        return appSettingRepository.findBySettingKey(EXPIRATION_ALERT_DAYS_KEY)
                .map(AppSetting::getSettingValue)
                .map(Integer::parseInt)
                .orElse(DEFAULT_EXPIRATION_ALERT_DAYS);
    }
}