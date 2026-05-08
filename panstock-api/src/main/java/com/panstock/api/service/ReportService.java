package com.panstock.api.service;

import com.panstock.api.dto.response.*;

import java.time.LocalDate;
import java.util.List;

public interface ReportService {

    WasteSummaryReportResponse getWasteSummary(LocalDate from, LocalDate to);

    EconomicLossReportResponse getEconomicLoss(LocalDate from, LocalDate to);

    List<WasteByCategoryResponse> getWasteByCategory(LocalDate from, LocalDate to);

    List<WasteBySupplierResponse> getWasteBySupplier(LocalDate from, LocalDate to);

    List<StockStatusReportResponse> getStockStatus();
}