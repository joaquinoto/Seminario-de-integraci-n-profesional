package com.panstock.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record StockSaleRequest(

        @NotNull(message = "El producto es obligatorio.")
        Long productId,

        Long userId,

        @NotNull(message = "La cantidad vendida es obligatoria.")
        @DecimalMin(value = "0.001", message = "La cantidad vendida debe ser mayor a cero.")
        BigDecimal quantity,

        String notes
) {
}