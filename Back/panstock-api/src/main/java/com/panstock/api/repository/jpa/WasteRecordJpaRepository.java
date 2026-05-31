package com.panstock.api.repository.jpa;

import com.panstock.api.entity.WasteRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface WasteRecordJpaRepository extends JpaRepository<WasteRecord, Long> {

    /**
     * Todos los registros ordenados por fecha descendente (más recientes primero).
     */
    List<WasteRecord> findAllByOrderByWasteDateDesc();

    /**
     * Registros en un rango de fechas, ordenados por fecha descendente.
     * Usado para filtros de período y para reportes.
     */
    List<WasteRecord> findByWasteDateBetweenOrderByWasteDateDesc(
            LocalDateTime from,
            LocalDateTime to
    );

    /**
     * Búsqueda flexible con filtros opcionales:
     *  - from / to  : rango de fechas de merma (ambos opcionales)
     *  - createdById: ID del usuario que registró la merma (opcional)
     *
     * Cuando un parámetro es null la condición se ignora (siempre verdadera),
     * lo que permite usar este único método para cualquier combinación.
     */
    @Query("""
            SELECT w
            FROM WasteRecord w
            LEFT JOIN FETCH w.product p
            LEFT JOIN FETCH p.category
            LEFT JOIN FETCH w.batch b
            LEFT JOIN FETCH b.supplier
            LEFT JOIN FETCH w.createdBy u
            WHERE (:from        IS NULL OR w.wasteDate  >= :from)
              AND (:to          IS NULL OR w.wasteDate  <= :to)
              AND (:createdById IS NULL OR u.id         =  :createdById)
            ORDER BY w.wasteDate DESC
            """)
    List<WasteRecord> search(
            @Param("from")        LocalDateTime from,
            @Param("to")          LocalDateTime to,
            @Param("createdById") Long createdById
    );
}