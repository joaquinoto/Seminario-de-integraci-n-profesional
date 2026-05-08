package com.panstock.api.service.impl;

import com.panstock.api.dto.request.StockEntryRequest;
import com.panstock.api.dto.response.ExpirationItemResponse;
import com.panstock.api.dto.response.InventoryBatchResponse;
import com.panstock.api.dto.response.StockSummaryResponse;
import com.panstock.api.entity.*;
import com.panstock.api.enums.*;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.InventoryBatchMapper;
import com.panstock.api.repository.*;
import com.panstock.api.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class StockServiceImpl implements StockService {

    private static final String EXPIRATION_ALERT_DAYS_KEY = "expiration_alert_days";
    private static final int DEFAULT_EXPIRATION_ALERT_DAYS = 2;

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository stockMovementRepository;
    private final AppSettingRepository appSettingRepository;

    @Override
    public InventoryBatchResponse registerEntry(StockEntryRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + request.productId()));

        Supplier supplier = null;
        if (request.supplierId() != null) {
            supplier = supplierRepository.findById(request.supplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id " + request.supplierId()));
        }

        validateStockEntry(product, request);

        InventoryBatch batch = new InventoryBatch();
        batch.setProduct(product);
        batch.setSupplier(supplier);
        batch.setReceivedDate(request.receivedDate());
        batch.setExpirationDate(request.expirationDate());
        batch.setInitialQuantity(request.quantity());
        batch.setCurrentQuantity(request.quantity());
        batch.setUnitCost(request.unitCost() != null ? request.unitCost() : product.getCostPrice());
        batch.setUnitSalePrice(request.unitSalePrice() != null ? request.unitSalePrice() : product.getSalePrice());
        batch.setStorageType(request.storageType());
        batch.setBatchStatus(BatchStatus.AVAILABLE);
        batch.setNotes(request.notes());

        InventoryBatch savedBatch = inventoryBatchRepository.save(batch);

        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setBatch(savedBatch);
        movement.setMovementType(StockMovementType.ENTRY);
        movement.setQuantity(request.quantity());
        movement.setNotes("Ingreso de mercadería" + (request.notes() != null ? ": " + request.notes() : ""));
        stockMovementRepository.save(movement);

        return InventoryBatchMapper.toResponse(
                savedBatch,
                calculateExpirationStatus(savedBatch.getExpirationDate())
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockSummaryResponse> getStockSummary() {
        List<InventoryBatch> batches = inventoryBatchRepository.findAvailableWithStock();

        Map<Long, StockAccumulator> grouped = new LinkedHashMap<>();

        for (InventoryBatch batch : batches) {
            Product product = batch.getProduct();

            grouped.putIfAbsent(
                    product.getId(),
                    new StockAccumulator(
                            product.getId(),
                            product.getName(),
                            product.getOrigin(),
                            product.getUnitType()
                    )
            );

            grouped.get(product.getId()).addBatch(batch);
        }

        return grouped.values()
                .stream()
                .map(StockAccumulator::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> getBatches() {
        return inventoryBatchRepository.findAll()
                .stream()
                .map(batch -> InventoryBatchMapper.toResponse(
                        batch,
                        calculateExpirationStatus(batch.getExpirationDate())
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryBatchResponse getBatchById(Long id) {
        InventoryBatch batch = inventoryBatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lote no encontrado con id " + id));

        return InventoryBatchMapper.toResponse(
                batch,
                calculateExpirationStatus(batch.getExpirationDate())
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpirationItemResponse> getExpiring(Integer days) {
        int alertDays = days != null ? days : getExpirationAlertDays();

        return inventoryBatchRepository.findAvailableWithStock()
                .stream()
                .filter(batch -> batch.getExpirationDate() != null)
                .map(this::toExpirationItem)
                .filter(item -> item.status() == ExpirationStatus.RED || item.status() == ExpirationStatus.YELLOW)
                .filter(item -> item.daysToExpire() != null && item.daysToExpire() >= 0 && item.daysToExpire() <= alertDays)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpirationItemResponse> getExpired() {
        return inventoryBatchRepository.findAll()
                .stream()
                .filter(batch -> batch.getExpirationDate() != null)
                .map(this::toExpirationItem)
                .filter(item -> item.status() == ExpirationStatus.EXPIRED)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ExpirationStatus calculateExpirationStatus(LocalDate expirationDate) {
        if (expirationDate == null) {
            return ExpirationStatus.NOT_APPLICABLE;
        }

        LocalDate today = LocalDate.now();
        long daysToExpire = ChronoUnit.DAYS.between(today, expirationDate);

        if (daysToExpire < 0) {
            return ExpirationStatus.EXPIRED;
        }

        if (daysToExpire == 0) {
            return ExpirationStatus.RED;
        }

        if (daysToExpire <= getExpirationAlertDays()) {
            return ExpirationStatus.YELLOW;
        }

        return ExpirationStatus.GREEN;
    }

    private void validateStockEntry(Product product, StockEntryRequest request) {
        if (request.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("La cantidad ingresada debe ser mayor a cero.");
        }

        if (Boolean.TRUE.equals(product.getPerishable()) && request.expirationDate() == null) {
            throw new BadRequestException("Los productos perecederos deben tener fecha de vencimiento.");
        }

        if (request.expirationDate() != null && request.expirationDate().isBefore(request.receivedDate())) {
            throw new BadRequestException("La fecha de vencimiento no puede ser anterior a la fecha de ingreso.");
        }
    }

    private ExpirationItemResponse toExpirationItem(InventoryBatch batch) {
        Long daysToExpire = null;

        if (batch.getExpirationDate() != null) {
            daysToExpire = ChronoUnit.DAYS.between(LocalDate.now(), batch.getExpirationDate());
        }

        return new ExpirationItemResponse(
                batch.getId(),
                batch.getProduct().getId(),
                batch.getProduct().getName(),
                batch.getCurrentQuantity(),
                batch.getExpirationDate(),
                daysToExpire,
                calculateExpirationStatus(batch.getExpirationDate())
        );
    }

    private int getExpirationAlertDays() {
        return appSettingRepository.findBySettingKey(EXPIRATION_ALERT_DAYS_KEY)
                .map(AppSetting::getSettingValue)
                .map(Integer::parseInt)
                .orElse(DEFAULT_EXPIRATION_ALERT_DAYS);
    }

    private static class StockAccumulator {

        private final Long productId;
        private final String productName;
        private final ProductOrigin origin;
        private final UnitType unitType;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private LocalDate nearestExpirationDate;

        private StockAccumulator(
                Long productId,
                String productName,
                ProductOrigin origin,
                UnitType unitType
        ) {
            this.productId = productId;
            this.productName = productName;
            this.origin = origin;
            this.unitType = unitType;
        }

        private void addBatch(InventoryBatch batch) {
            totalQuantity = totalQuantity.add(batch.getCurrentQuantity());

            LocalDate expirationDate = batch.getExpirationDate();
            if (expirationDate != null) {
                if (nearestExpirationDate == null || expirationDate.isBefore(nearestExpirationDate)) {
                    nearestExpirationDate = expirationDate;
                }
            }
        }

        private StockSummaryResponse toResponse() {
            return new StockSummaryResponse(
                    productId,
                    productName,
                    origin,
                    unitType,
                    totalQuantity,
                    nearestExpirationDate
            );
        }
    }
}