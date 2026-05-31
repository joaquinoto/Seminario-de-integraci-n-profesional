package com.panstock.api.mapper;

import com.panstock.api.dto.response.AlertResponse;
import com.panstock.api.entity.Alert;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;

public class AlertMapper {

    private AlertMapper() {
    }

    public static AlertResponse toResponse(Alert alert) {
        if (alert == null) {
            return null;
        }

        Product product = alert.getProduct();
        InventoryBatch batch = alert.getBatch();

        return new AlertResponse(
                alert.getId(),
                alert.getAlertType(),
                product != null ? product.getId() : null,
                product != null ? product.getName() : null,
                batch != null ? batch.getId() : null,
                batch != null ? batch.getExpirationDate() : null,
                alert.getMessage(),
                alert.getSeverity(),
                alert.getStatus(),
                alert.getCreatedAt(),
                alert.getResolvedAt()
        );
    }
}