package com.panstock.api.controller;

import com.panstock.api.dto.request.StockEntryRequest;
import com.panstock.api.dto.response.ExpirationItemResponse;
import com.panstock.api.dto.response.InventoryBatchResponse;
import com.panstock.api.dto.response.StockSummaryResponse;
import com.panstock.api.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockEntryController {

    private final StockService stockService;

    @PostMapping("/entries")
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryBatchResponse registerEntry(@Valid @RequestBody StockEntryRequest request) {
        return stockService.registerEntry(request);
    }

    @GetMapping
    public List<StockSummaryResponse> getStockSummary() {
        return stockService.getStockSummary();
    }

    @GetMapping("/batches")
    public List<InventoryBatchResponse> getBatches() {
        return stockService.getBatches();
    }

    @GetMapping("/batches/{id}")
    public InventoryBatchResponse getBatchById(@PathVariable Long id) {
        return stockService.getBatchById(id);
    }

    @GetMapping("/expiring")
    public List<ExpirationItemResponse> getExpiring(
            @RequestParam(required = false) Integer days
    ) {
        return stockService.getExpiring(days);
    }

    @GetMapping("/expired")
    public List<ExpirationItemResponse> getExpired() {
        return stockService.getExpired();
    }
}