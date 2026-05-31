package com.panstock.api.dto.response;

import com.panstock.api.enums.ExpirationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PromotionSuggestionResponse(
        Long batchId,
        Long productId,
        String productName,
        BigDecimal currentQuantity,
        LocalDate expirationDate,
        Long daysToExpire,
        ExpirationStatus expirationStatus,
        BigDecimal suggestedDiscountPercentage,
        String suggestedTitle
) {
}