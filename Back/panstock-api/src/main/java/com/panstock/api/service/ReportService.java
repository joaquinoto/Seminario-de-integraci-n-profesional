package com.panstock.api.service;

import com.panstock.api.dto.response.*;

import java.time.LocalDate;
import java.util.List;

public interface ReportService {

    // ── Waste reports ────────────────────────────────────────────
    WasteSummaryReportResponse getWasteSummary(LocalDate from, LocalDate to);
    EconomicLossReportResponse getEconomicLoss(LocalDate from, LocalDate to);
    List<WasteByCategoryResponse> getWasteByCategory(LocalDate from, LocalDate to);
    List<WasteBySupplierResponse> getWasteBySupplier(LocalDate from, LocalDate to);
    List<StockStatusReportResponse> getStockStatus();

    // ── Sales reports ────────────────────────────────────────────────
    SalesReportResponse getSalesSummary(LocalDate from, LocalDate to);
    List<SalesByProductResponse> getSalesByProduct(LocalDate from, LocalDate to);
    List<SalesByCategoryResponse> getSalesByCategory(LocalDate from, LocalDate to);

    // ── Stock balance report ─────────────────────────────────────────
    StockBalanceResponse getStockBalance(LocalDate from, LocalDate to);
    List<StockBalanceByProductResponse> getStockBalanceByProduct(LocalDate from, LocalDate to);
}
