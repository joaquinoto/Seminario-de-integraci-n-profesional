package com.panstock.api.service.impl;

import com.panstock.api.dto.response.DashboardSemaphoreResponse;
import com.panstock.api.dto.response.ExpirationItemResponse;
import com.panstock.api.enums.ExpirationStatus;
import com.panstock.api.service.DashboardService;
import com.panstock.api.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final StockService stockService;

    /**
     * Semáforo de vencimientos:
     * - getExpiring(null)  → todos los lotes disponibles con fecha, no vencidos, ordenados por urgencia
     * - getExpired()       → todos los lotes vencidos (cualquier batch_status)
     * Combina ambas listas y devuelve conteos por color + lista completa.
     */
    @Override
    public DashboardSemaphoreResponse getExpirationSemaphore() {
        List<ExpirationItemResponse> expiring = stockService.getExpiring(null);
        List<ExpirationItemResponse> expired  = stockService.getExpired();

        List<ExpirationItemResponse> items = new ArrayList<>();
        items.addAll(expired);   // primero los vencidos
        items.addAll(expiring);  // luego los próximos (ya vienen ordenados por urgencia)

        long greenCount   = items.stream().filter(i -> i.status() == ExpirationStatus.GREEN).count();
        long yellowCount  = items.stream().filter(i -> i.status() == ExpirationStatus.YELLOW).count();
        long redCount     = items.stream().filter(i -> i.status() == ExpirationStatus.RED).count();
        long expiredCount = items.stream().filter(i -> i.status() == ExpirationStatus.EXPIRED).count();

        return new DashboardSemaphoreResponse(greenCount, yellowCount, redCount, expiredCount, items);
    }
}