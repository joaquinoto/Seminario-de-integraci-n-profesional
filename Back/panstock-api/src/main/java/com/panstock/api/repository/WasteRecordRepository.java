package com.panstock.api.repository;

import com.panstock.api.entity.WasteRecord;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WasteRecordRepository {

    WasteRecord save(WasteRecord wasteRecord);

    Optional<WasteRecord> findById(Long id);

    /**
     * Devuelve todos los registros de merma, ordenados por fecha descendente.
     */
    List<WasteRecord> findAll();

    /**
     * Devuelve registros de merma dentro de un rango de fechas (para reportes).
     */
    List<WasteRecord> findByWasteDateBetween(LocalDateTime from, LocalDateTime to);

    /**
     * Búsqueda con todos los filtros opcionales: rango de fechas + createdById.
     * Si from/to son null no se aplica filtro de fecha.
     * Si createdById es null no se aplica filtro de usuario.
     */
    List<WasteRecord> search(LocalDateTime from, LocalDateTime to, Long createdById);
}