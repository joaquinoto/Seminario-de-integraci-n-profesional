package com.panstock.api.controller;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.service.WasteRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/waste-records")
@RequiredArgsConstructor
public class WasteRecordController {

    private final WasteRecordService wasteRecordService;

    /**
     * POST /api/waste-records
     * Acceso: SOLO OWNER (restringido en SecurityConfig)
     * Registra una nueva merma y descuenta stock del lote.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WasteRecordResponse create(@Valid @RequestBody WasteRecordRequest request) {
        return wasteRecordService.create(request);
    }

    /**
     * GET /api/waste-records
     * Acceso: OWNER y EMPLOYEE (solo lectura)
     * Soporta filtro por rango de fechas: ?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    @GetMapping
    public List<WasteRecordResponse> findAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return wasteRecordService.findAll(from, to);
    }

    /**
     * GET /api/waste-records/{id}
     * Acceso: OWNER y EMPLOYEE
     */
    @GetMapping("/{id}")
    public WasteRecordResponse findById(@PathVariable Long id) {
        return wasteRecordService.findById(id);
    }
}