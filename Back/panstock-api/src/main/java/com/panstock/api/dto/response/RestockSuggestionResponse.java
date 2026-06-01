package com.panstock.api.dto.response;

import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.enums.UnitType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO devuelto por GET /api/stock/restock-suggestions
 *
 * Contiene todo lo necesario para que el frontend OWNER muestre el
 * módulo de reposición: producto, stock actual vs mínimo, último lote
 * recibido (fecha, cantidad, proveedor) y el horario de pedido del proveedor.
 */
public record RestockSuggestionResponse(

        Long   productId,
        String productName,
        String categoryName,
        ProductOrigin origin,
        UnitType unitType,

        /** Stock total disponible (suma de lotes AVAILABLE con stock > 0) */
        BigDecimal currentStock,

        /** Mínimo configurado en el producto */
        BigDecimal minimumStock,

        /** currentStock / minimumStock × 100  (null si minimumStock == 0) */
        Integer stockPercentage,

        /** Fecha de recepción del lote más reciente para este producto */
        LocalDate lastBatchReceivedDate,

        /** Cantidad inicial de ese último lote */
        BigDecimal lastBatchQuantity,

        Long   supplierId,
        String supplierName,

        /**
         * Horario / días de pedido del proveedor.
         * Se construye en el servicio a partir de reglas fijas de negocio.
         */
        String supplierOrderSchedule
) {}