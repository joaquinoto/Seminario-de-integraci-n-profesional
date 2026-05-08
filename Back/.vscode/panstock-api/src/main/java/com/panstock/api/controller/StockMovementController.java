package com.panstock.api.controller;

import com.panstock.api.dto.response.StockMovementHistoryResponse;
import com.panstock.api.enums.StockMovementType;
import com.panstock.api.service.StockMovementService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stock/movements")
public class StockMovementController {

    private final StockMovementService stockMovementService;

    @GetMapping
    public List<StockMovementHistoryResponse> findAll(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) StockMovementType movementType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return stockMovementService.findAll(
                productId,
                batchId,
                movementType,
                from,
                to
        );
    }

    @GetMapping("/{id}")
    public StockMovementHistoryResponse findById(@PathVariable Long id) {
        return stockMovementService.findById(id);
    }
}