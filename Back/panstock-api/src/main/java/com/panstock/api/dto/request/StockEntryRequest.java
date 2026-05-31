package com.panstock.api.dto.request;

import com.panstock.api.enums.StorageType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StockEntryRequest(
        @NotNull Long productId,
        Long supplierId,

        @NotNull LocalDate receivedDate,
        LocalDate expirationDate,

        @NotNull @Positive BigDecimal quantity,

        BigDecimal unitCost,
        BigDecimal unitSalePrice,

        StorageType storageType,
        String notes
) {
}