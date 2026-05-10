package com.panstock.api.mapper;

import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.entity.WasteRecord;

public class WasteRecordMapper {

    private WasteRecordMapper() {
    }

    public static WasteRecordResponse toResponse(WasteRecord wasteRecord) {
        return new WasteRecordResponse(
                wasteRecord.getId(),

                wasteRecord.getProduct().getId(),
                wasteRecord.getProduct().getName(),

                wasteRecord.getBatch().getId(),

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