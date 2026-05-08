package com.panstock.api.service;

import com.panstock.api.dto.request.StockEntryRequest;
import com.panstock.api.dto.response.ExpirationItemResponse;
import com.panstock.api.dto.response.InventoryBatchResponse;
import com.panstock.api.dto.response.StockSummaryResponse;
import com.panstock.api.enums.ExpirationStatus;

import java.time.LocalDate;
import java.util.List;

public interface StockService {

    InventoryBatchResponse registerEntry(StockEntryRequest request);

    List<StockSummaryResponse> getStockSummary();

    List<InventoryBatchResponse> getBatches();

    InventoryBatchResponse getBatchById(Long id);

    List<ExpirationItemResponse> getExpiring(Integer days);

    List<ExpirationItemResponse> getExpired();

    ExpirationStatus calculateExpirationStatus(LocalDate expirationDate);
}