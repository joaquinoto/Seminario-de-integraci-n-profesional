package com.panstock.api.controller;

import com.panstock.api.dto.response.*;
import com.panstock.api.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/waste-summary")
    public WasteSummaryReportResponse getWasteSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getWasteSummary(from, to);
    }

    @GetMapping("/economic-loss")
    public EconomicLossReportResponse getEconomicLoss(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getEconomicLoss(from, to);
    }

    @GetMapping("/waste-by-category")
    public List<WasteByCategoryResponse> getWasteByCategory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getWasteByCategory(from, to);
    }

    @GetMapping("/waste-by-supplier")
    public List<WasteBySupplierResponse> getWasteBySupplier(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getWasteBySupplier(from, to);
    }

    @GetMapping("/stock-status")
    public List<StockStatusReportResponse> getStockStatus() {
        return reportService.getStockStatus();
    }
}