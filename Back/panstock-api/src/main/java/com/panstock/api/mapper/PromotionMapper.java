package com.panstock.api.mapper;

import com.panstock.api.dto.response.PromotionResponse;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.Promotion;

public class PromotionMapper {

    private PromotionMapper() {
    }

    public static PromotionResponse toResponse(Promotion promotion) {
        if (promotion == null) {
            return null;
        }

        Product product = promotion.getProduct();
        InventoryBatch batch = promotion.getBatch();

        return new PromotionResponse(
                promotion.getId(),
                product != null ? product.getId() : null,
                product != null ? product.getName() : null,
                batch != null ? batch.getId() : null,
                promotion.getTitle(),
                promotion.getDescription(),
                promotion.getDiscountType(),
                promotion.getDiscountPercentage(),
                promotion.getPromotionalPrice(),
                promotion.getStartDate(),
                promotion.getEndDate(),
                promotion.getStatus(),
                promotion.getSuggestedBySystem()
        );
    }
}