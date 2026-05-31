package com.panstock.api.dto.response;

import com.panstock.api.enums.WasteReason;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO de respuesta para registros de merma.
 *
 * Incluye datos enriquecidos para que el frontend pueda
 * filtrar y visualizar sin consultas adicionales:
 *  - createdById/createdByName: identidad del usuario que registró la merma
 *  - categoryId/categoryName: categoría del producto
 *  - supplierId/supplierName: proveedor del lote (puede ser null)
 */
public record WasteRecordResponse(
        Long id,

        Long productId,
        String productName,

        Long categoryId,
        String categoryName,

        Long batchId,

        // Usuario que registró la merma — siempre presente si el registro es correcto
        Long createdById,
        String createdByName,

        BigDecimal quantity,
        WasteReason reason,

        // Proveedor del lote (puede ser null si el lote no tiene proveedor asignado)
        Long supplierId,
        String supplierName,

        BigDecimal unitCost,
        BigDecimal unitSalePrice,
        BigDecimal economicLoss,

        LocalDateTime wasteDate,
        String notes
) {
}