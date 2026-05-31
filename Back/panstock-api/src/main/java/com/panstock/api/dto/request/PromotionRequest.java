package com.panstock.api.dto.request;

import com.panstock.api.enums.DiscountType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PromotionRequest(

        @NotNull(message = "El producto es obligatorio.")
        Long productId,

        Long batchId,

        Long createdById,

        @NotBlank(message = "El título de la promoción es obligatorio.")
        @Size(max = 150, message = "El título no puede superar los 150 caracteres.")
        String title,

        String description,

        @NotNull(message = "El tipo de descuento es obligatorio.")
        DiscountType discountType,

        @DecimalMin(value = "1.00", message = "El porcentaje de descuento debe ser como mínimo 1.")
        @DecimalMax(value = "100.00", message = "El porcentaje de descuento no puede superar 100.")
        BigDecimal discountPercentage,

        @DecimalMin(value = "0.01", message = "El precio promocional debe ser mayor a cero.")
        BigDecimal promotionalPrice,

        @NotNull(message = "La fecha de inicio es obligatoria.")
        LocalDateTime startDate,

        @NotNull(message = "La fecha de fin es obligatoria.")
        LocalDateTime endDate,

        Boolean suggestedBySystem
) {
}