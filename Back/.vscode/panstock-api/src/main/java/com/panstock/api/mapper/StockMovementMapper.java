package com.panstock.api.mapper;

import com.panstock.api.dto.response.StockMovementHistoryResponse;
import com.panstock.api.dto.response.StockMovementResponse;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.StockMovement;
import com.panstock.api.entity.User;

public class StockMovementMapper {

    private StockMovementMapper() {
    }

    public static StockMovementResponse toResponse(StockMovement movement) {
        if (movement == null) {
            return null;
        }

        Product product = movement.getProduct();
        InventoryBatch batch = movement.getBatch();

        return new StockMovementResponse(
                movement.getId(),
                product != null ? product.getId() : null,
                product != null ? product.getName() : null,
                batch != null ? batch.getId() : null,
                movement.getMovementType(),
                movement.getQuantity(),
                movement.getMovementDate(),
                movement.getNotes()
        );
    }

    public static StockMovementHistoryResponse toHistoryResponse(StockMovement movement) {
        if (movement == null) {
            return null;
        }

        Product product = movement.getProduct();
        InventoryBatch batch = movement.getBatch();
        User user = movement.getUser();

        return new StockMovementHistoryResponse(
                movement.getId(),
                product != null ? product.getId() : null,
                product != null ? product.getName() : null,
                batch != null ? batch.getId() : null,
                user != null ? user.getId() : null,
                movement.getMovementType(),
                movement.getQuantity(),
                movement.getMovementDate(),
                movement.getRelatedWasteRecordId(),
                movement.getNotes()
        );
    }
}