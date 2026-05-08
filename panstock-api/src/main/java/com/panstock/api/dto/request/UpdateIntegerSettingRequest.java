package com.panstock.api.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateIntegerSettingRequest(

        @NotNull(message = "El valor es obligatorio.")
        @Min(value = 1, message = "El valor debe ser como mínimo 1.")
        @Max(value = 30, message = "El valor no puede superar 30.")
        Integer value
) {
}