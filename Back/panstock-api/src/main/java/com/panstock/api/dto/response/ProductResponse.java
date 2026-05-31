package com.panstock.api.dto.response;

import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.enums.UnitType;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String name,
        String description,

        Long categoryId,
        String categoryName,

        Long defaultSupplierId,
        String defaultSupplierName,

        ProductOrigin origin,
        Boolean perishable,
        UnitType unitType,

        BigDecimal costPrice,
        BigDecimal salePrice,
        BigDecimal minimumStock,

        Boolean active
) {
}