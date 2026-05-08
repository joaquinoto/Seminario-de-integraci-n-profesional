package com.panstock.api.service.impl;

import com.panstock.api.dto.response.DashboardSemaphoreResponse;
import com.panstock.api.dto.response.ExpirationItemResponse;
import com.panstock.api.enums.ExpirationStatus;
import com.panstock.api.service.DashboardService;
import com.panstock.api.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final StockService stockService;

    @Override
    public DashboardSemaphoreResponse getExpirationSemaphore() {
        List<ExpirationItemResponse> expiring = stockService.getExpiring(null);
        List<ExpirationItemResponse> expired = stockService.getExpired();

        List<ExpirationItemResponse> items = new java.util.ArrayList<>();
        items.addAll(expiring);
        items.addAll(expired);

        items.sort(Comparator.comparing(
                ExpirationItemResponse::expirationDate,
                Comparator.nullsLast(Comparator.naturalOrder())
        ));

        long greenCount = items.stream().filter(item -> item.status() == ExpirationStatus.GREEN).count();
        long yellowCount = items.stream().filter(item -> item.status() == ExpirationStatus.YELLOW).count();
        long redCount = items.stream().filter(item -> item.status() == ExpirationStatus.RED).count();
        long expiredCount = items.stream().filter(item -> item.status() == ExpirationStatus.EXPIRED).count();

        return new DashboardSemaphoreResponse(
                greenCount,
                yellowCount,
                redCount,
                expiredCount,
                items
        );
    }
}