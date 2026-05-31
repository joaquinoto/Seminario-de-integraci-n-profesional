package com.panstock.api.controller;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.enums.WasteReason;
import com.panstock.api.service.WasteRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * WasteRecordController — accesible por OWNER y EMPLOYEE.
 *
 * GET  /api/waste-records               → lista con filtros opcionales
 * GET  /api/waste-records/{id}          → por ID
 * POST /api/waste-records               → registrar merma
 *
 * Filtros opcionales en GET /api/waste-records:
 *   ?from=YYYY-MM-DD      → fecha desde (inclusive)
 *   ?to=YYYY-MM-DD        → fecha hasta (inclusive)
 *   ?categoryId=N         → filtra por categoría del producto
 *   ?supplierId=N         → filtra por proveedor del lote
 *   ?reason=EXPIRED       → filtra por motivo (enum WasteReason)
 *   ?createdById=N        → filtra por usuario que registró la merma
 */
@RestController
@RequestMapping("/api/waste-records")
@RequiredArgsConstructor
public class WasteRecordController {

    private final WasteRecordService wasteRecordService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WasteRecordResponse create(@Valid @RequestBody WasteRecordRequest request) {
        return wasteRecordService.create(request);
    }

    @GetMapping
    public List<WasteRecordResponse> findAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,

            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) WasteReason reason,

            // NUEVO: filtro por usuario que registró la merma
            @RequestParam(required = false) Long createdById
    ) {
        return wasteRecordService.findAll(from, to, categoryId, supplierId, reason, createdById);
    }

    @GetMapping("/{id}")
    public WasteRecordResponse findById(@PathVariable Long id) {
        return wasteRecordService.findById(id);
    }
}