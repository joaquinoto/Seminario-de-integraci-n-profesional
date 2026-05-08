package com.panstock.api.controller;

import com.panstock.api.dto.request.StockAdjustmentRequest;
import com.panstock.api.dto.request.StockSaleRequest;
import com.panstock.api.dto.response.StockOperationResponse;
import com.panstock.api.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stock")
public class StockOperationController {

    private final StockService stockService;

    @PostMapping("/sales")
    public StockOperationResponse registerSale(@Valid @RequestBody StockSaleRequest request) {
        return stockService.registerSale(request);
    }

    @PostMapping("/adjustments")
    public StockOperationResponse registerAdjustment(@Valid @RequestBody StockAdjustmentRequest request) {
        return stockService.registerAdjustment(request);
    }
}