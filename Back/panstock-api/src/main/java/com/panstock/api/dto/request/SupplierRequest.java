package com.panstock.api.dto.request;

import com.panstock.api.enums.SupplierType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SupplierRequest(

        @NotBlank(message = "El nombre del proveedor es obligatorio.")
        @Size(max = 150, message = "El nombre del proveedor no puede superar los 150 caracteres.")
        String name,

        @NotNull(message = "El tipo de proveedor es obligatorio.")
        SupplierType supplierType,

        @Size(max = 150, message = "El nombre de contacto no puede superar los 150 caracteres.")
        String contactName,

        @Size(max = 50, message = "El teléfono no puede superar los 50 caracteres.")
        String phone,

        @Email(message = "El email del proveedor no tiene un formato válido.")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres.")
        String email,

        String notes,

        Boolean active
) {
}