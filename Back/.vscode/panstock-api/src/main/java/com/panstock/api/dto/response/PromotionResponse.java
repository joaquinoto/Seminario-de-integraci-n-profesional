package com.panstock.api.dto.response;

import com.panstock.api.enums.DiscountType;
import com.panstock.api.enums.PromotionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PromotionResponse(
        Long id,
        Long productId,
        String productName,
        Long batchId,
        String title,
        String description,
        DiscountType discountType,
        BigDecimal discountPercentage,
        BigDecimal promotionalPrice,
        LocalDateTime startDate,
        LocalDateTime endDate,
        PromotionStatus status,
        Boolean suggestedBySystem
) {
}