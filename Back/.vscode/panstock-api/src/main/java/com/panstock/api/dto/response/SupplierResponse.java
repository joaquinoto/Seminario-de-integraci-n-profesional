package com.panstock.api.dto.response;

import com.panstock.api.enums.SupplierType;

public record SupplierResponse(
        Long id,
        String name,
        SupplierType supplierType,
        String contactName,
        String phone,
        String email,
        String notes,
        Boolean active
) {
}