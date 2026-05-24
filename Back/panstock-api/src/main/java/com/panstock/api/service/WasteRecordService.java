package com.panstock.api.service;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;

import java.time.LocalDate;
import java.util.List;

public interface WasteRecordService {

    /**
     * Registra una merma. Descuenta stock del lote y genera movimiento WASTE.
     * Solo OWNER puede llamar a este método (garantizado por SecurityConfig).
     */
    WasteRecordResponse create(WasteRecordRequest request);

    /**
     * Lista todas las mermas, con filtro opcional por rango de fechas.
     * Si from/to son null, devuelve todo el historial.
     */
    List<WasteRecordResponse> findAll(LocalDate from, LocalDate to);

    WasteRecordResponse findById(Long id);
}