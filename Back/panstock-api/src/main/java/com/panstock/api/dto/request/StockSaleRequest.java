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

        /**
         * Precio unitario de venta aplicado (incluye precio de promo si aplica).
         * Opcional — si viene null se usa el precio del lote o del producto.
         * Se persiste en unit_sale_price de stock_movements.
         */
        BigDecimal unitSalePrice,

        String notes
) {
}