package com.panstock.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(

        @NotBlank(message = "El nombre de la categoría es obligatorio.")
        @Size(max = 100, message = "El nombre de la categoría no puede superar los 100 caracteres.")
        String name,

        @Size(max = 255, message = "La descripción no puede superar los 255 caracteres.")
        String description,

        Boolean active
) {
}