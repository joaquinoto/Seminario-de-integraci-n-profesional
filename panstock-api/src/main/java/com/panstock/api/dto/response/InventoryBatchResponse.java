package com.panstock.api.dto.response;

import com.panstock.api.enums.BatchStatus;
import com.panstock.api.enums.ExpirationStatus;
import com.panstock.api.enums.StorageType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InventoryBatchResponse(
        Long id,

        Long productId,
        String productName,

        Long supplierId,
        String supplierName,

        LocalDate receivedDate,
        LocalDate expirationDate,

        BigDecimal initialQuantity,
        BigDecimal currentQuantity,

        BigDecimal unitCost,
        BigDecimal unitSalePrice,

        StorageType storageType,
        BatchStatus batchStatus,
        ExpirationStatus expirationStatus,

        String notes
) {
}