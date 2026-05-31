package com.panstock.api.dto.request;

import com.panstock.api.enums.StockAdjustmentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record StockAdjustmentRequest(

        @NotNull(message = "El lote es obligatorio.")
        Long batchId,

        Long userId,

        @NotNull(message = "El tipo de ajuste es obligatorio.")
        StockAdjustmentType adjustmentType,

        @NotNull(message = "La cantidad del ajuste es obligatoria.")
        @DecimalMin(value = "0.001", message = "La cantidad del ajuste debe ser mayor a cero.")
        BigDecimal quantity,

        String notes
) {
}