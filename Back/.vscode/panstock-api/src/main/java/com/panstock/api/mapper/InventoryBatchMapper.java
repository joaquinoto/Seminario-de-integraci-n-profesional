package com.panstock.api.mapper;

import com.panstock.api.dto.response.InventoryBatchResponse;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.enums.ExpirationStatus;

public class InventoryBatchMapper {

    private InventoryBatchMapper() {
    }

    public static InventoryBatchResponse toResponse(
            InventoryBatch batch,
            ExpirationStatus expirationStatus
    ) {
        return new InventoryBatchResponse(
                batch.getId(),

                batch.getProduct().getId(),
                batch.getProduct().getName(),

                batch.getSupplier() != null ? batch.getSupplier().getId() : null,
                batch.getSupplier() != null ? batch.getSupplier().getName() : null,

                batch.getReceivedDate(),
                batch.getExpirationDate(),

                batch.getInitialQuantity(),
                batch.getCurrentQuantity(),

                batch.getUnitCost(),
                batch.getUnitSalePrice(),

                batch.getStorageType(),
                batch.getBatchStatus(),
                expirationStatus,

                batch.getNotes()
        );
    }
}