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

    // ── Waste ─────────────────────────────────────────────────────────────────

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

    // ── Sales ─────────────────────────────────────────────────────────────────

    @GetMapping("/sales-summary")
    public SalesReportResponse getSalesSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getSalesSummary(from, to);
    }

    @GetMapping("/sales-by-product")
    public List<SalesByProductResponse> getSalesByProduct(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getSalesByProduct(from, to);
    }

    @GetMapping("/sales-by-category")
    public List<SalesByCategoryResponse> getSalesByCategory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getSalesByCategory(from, to);
    }

    // ── Stock Balance ─────────────────────────────────────────────────────────

    @GetMapping("/stock-balance")
    public StockBalanceResponse getStockBalance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getStockBalance(from, to);
    }

    @GetMapping("/stock-balance-by-product")
    public List<StockBalanceByProductResponse> getStockBalanceByProduct(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getStockBalanceByProduct(from, to);
    }
}
