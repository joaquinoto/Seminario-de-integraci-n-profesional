package com.panstock.api.dto.request;

import com.panstock.api.enums.WasteReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record WasteRecordRequest(

        @NotNull(message = "El id del lote es obligatorio.")
        Long batchId,

        // El usuario que registra la merma es REQUERIDO para trazabilidad.
        // El frontend siempre envía el id del usuario autenticado.
        @NotNull(message = "El id del usuario que registra la merma es obligatorio.")
        Long userId,

        @NotNull(message = "La cantidad es obligatoria.")
        @Positive(message = "La cantidad debe ser mayor a cero.")
        BigDecimal quantity,

        @NotNull(message = "El motivo de la merma es obligatorio.")
        WasteReason reason,

        String notes
) {
}