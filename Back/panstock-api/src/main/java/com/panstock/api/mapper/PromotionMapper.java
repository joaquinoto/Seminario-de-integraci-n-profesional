package com.panstock.api.mapper;

import com.panstock.api.dto.response.PromotionResponse;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.Promotion;
import com.panstock.api.entity.User;
import com.panstock.api.enums.ExpirationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

public class PromotionMapper {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private PromotionMapper() {
    }

    public static PromotionResponse toResponse(Promotion promotion) {
        if (promotion == null) {
            return null;
        }

        Product product    = promotion.getProduct();
        InventoryBatch batch = promotion.getBatch();
        User createdBy     = promotion.getCreatedBy();

        // ── Datos del lote ────────────────────────────────────────────
        LocalDate batchExpDate    = batch != null ? batch.getExpirationDate()  : null;
        BigDecimal batchCurrentQty = batch != null ? batch.getCurrentQuantity() : null;

        Long daysToExpire = null;
        if (batchExpDate != null) {
            daysToExpire = ChronoUnit.DAYS.between(LocalDate.now(ZONE), batchExpDate);
        }

        // ── Precio original: del lote o del producto ──────────────────
        BigDecimal originalPrice = null;
        if (batch != null && batch.getUnitSalePrice() != null) {
            originalPrice = batch.getUnitSalePrice();
        } else if (product != null && product.getSalePrice() != null) {
            originalPrice = product.getSalePrice();
        }

        // ── Nombre completo del creador ───────────────────────────────
        String createdByName = null;
        if (createdBy != null) {
            String first = createdBy.getFirstName() != null ? createdBy.getFirstName().trim() : "";
            String last  = createdBy.getLastName()  != null ? createdBy.getLastName().trim()  : "";
            if (!first.isEmpty() && !last.isEmpty()) {
                createdByName = first + " " + last;
            } else if (!first.isEmpty()) {
                createdByName = first;
            } else if (!last.isEmpty()) {
                createdByName = last;
            } else {
                createdByName = createdBy.getUsername();
            }
        }

        return new PromotionResponse(
                promotion.getId(),

                product != null ? product.getId()   : null,
                product != null ? product.getName() : null,

                batch != null ? batch.getId() : null,
                batchExpDate,
                daysToExpire,
                batchCurrentQty,

                createdBy != null ? createdBy.getId() : null,
                createdByName,

                promotion.getTitle(),
                promotion.getDescription(),

                promotion.getDiscountType(),
                promotion.getDiscountPercentage(),
                promotion.getPromotionalPrice(),

                originalPrice,

                promotion.getStartDate(),
                promotion.getEndDate(),

                promotion.getStatus(),
                promotion.getSuggestedBySystem(),

                promotion.getCreatedAt()
        );
    }
}