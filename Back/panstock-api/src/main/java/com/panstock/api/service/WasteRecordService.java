package com.panstock.api.service;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.enums.WasteReason;

import java.time.LocalDate;
import java.util.List;

public interface WasteRecordService {

    /**
     * Crea un registro de merma, descuenta el stock del lote y
     * genera el movimiento de stock tipo WASTE.
     */
    WasteRecordResponse create(WasteRecordRequest request);

    /**
     * Lista mermas con filtros opcionales:
     *
     * @param from         fecha desde (inclusive, en zona local)
     * @param to           fecha hasta (inclusive, en zona local)
     * @param categoryId   filtra por categoría del producto
     * @param supplierId   filtra por proveedor del lote o del producto
     * @param reason       filtra por motivo de merma
     * @param createdById  filtra por usuario que registró la merma
     */
    List<WasteRecordResponse> findAll(
            LocalDate from,
            LocalDate to,
            Long categoryId,
            Long supplierId,
            WasteReason reason,
            Long createdById
    );

    WasteRecordResponse findById(Long id);
}