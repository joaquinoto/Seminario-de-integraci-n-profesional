package com.panstock.api.dto.request;

import com.panstock.api.enums.WasteReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record WasteRecordRequest(
        @NotNull Long batchId,
        Long userId,

        @NotNull @Positive BigDecimal quantity,
        @NotNull WasteReason reason,

        String notes
) {
}