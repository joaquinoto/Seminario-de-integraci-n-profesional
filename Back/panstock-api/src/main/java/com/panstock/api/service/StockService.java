package com.panstock.api.service;

import com.panstock.api.dto.request.StockAdjustmentRequest;
import com.panstock.api.dto.request.StockEntryRequest;
import com.panstock.api.dto.request.StockSaleRequest;
import com.panstock.api.dto.response.ExpirationItemResponse;
import com.panstock.api.dto.response.InventoryBatchResponse;
import com.panstock.api.dto.response.StockOperationResponse;
import com.panstock.api.dto.response.StockSummaryResponse;
import com.panstock.api.enums.ExpirationStatus;

import java.time.LocalDate;
import java.util.List;

public interface StockService {

    InventoryBatchResponse registerEntry(StockEntryRequest request);

    StockOperationResponse registerSale(StockSaleRequest request);

    StockOperationResponse registerAdjustment(StockAdjustmentRequest request);

    List<StockSummaryResponse> getStockSummary();

    List<InventoryBatchResponse> getBatches();

    InventoryBatchResponse getBatchById(Long id);

    List<ExpirationItemResponse> getExpiring(Integer days);

    List<ExpirationItemResponse> getExpired();

    ExpirationStatus calculateExpirationStatus(LocalDate expirationDate);
}