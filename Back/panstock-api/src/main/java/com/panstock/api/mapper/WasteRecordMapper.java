package com.panstock.api.mapper;

import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.entity.User;
import com.panstock.api.entity.WasteRecord;

public class WasteRecordMapper {

    private WasteRecordMapper() {
    }

    public static WasteRecordResponse toResponse(WasteRecord wasteRecord) {
        User createdBy = wasteRecord.getCreatedBy();

        return new WasteRecordResponse(
                wasteRecord.getId(),

                wasteRecord.getProduct().getId(),
                wasteRecord.getProduct().getName(),

                wasteRecord.getBatch().getId(),

                // AGREGADOS: usuario que registró la merma
                createdBy != null ? createdBy.getId() : null,
                createdBy != null ? createdBy.getFirstName() + " " + createdBy.getLastName() : null,

                wasteRecord.getQuantity(),
                wasteRecord.getReason(),

                wasteRecord.getUnitCost(),
                wasteRecord.getUnitSalePrice(),
                wasteRecord.getEconomicLoss(),

                wasteRecord.getWasteDate(),
                wasteRecord.getNotes()
        );
    }
}