package com.panstock.api.dto.request;

import com.panstock.api.enums.WasteReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * WasteRecordRequest
 *
 * userId es OPCIONAL: cuando el registro lo hace el sistema de forma automática
 * (descarte de lotes vencidos disparado desde el frontend), se envía null.
 * createdBy quedará null en la base de datos, lo que indica origen automático.
 */
public record WasteRecordRequest(

        @NotNull(message = "El id del lote es obligatorio.")
        Long batchId,

        // Sin @NotNull → null = registro automático del sistema
        Long userId,

        @NotNull(message = "La cantidad es obligatoria.")
        @Positive(message = "La cantidad debe ser mayor a cero.")
        BigDecimal quantity,

        @NotNull(message = "El motivo de la merma es obligatorio.")
        WasteReason reason,

        String notes
) {
}