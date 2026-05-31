package com.panstock.api.dto.response;

import java.math.BigDecimal;

public record WasteBySupplierResponse(
        Long supplierId,
        String supplierName,
        Long wasteRecordsCount,
        BigDecimal totalQuantity,
        BigDecimal totalEconomicLoss
) {
}