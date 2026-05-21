package com.panstock.api.service.impl;

import com.panstock.api.dto.request.StockAdjustmentRequest;
import com.panstock.api.dto.request.StockEntryRequest;
import com.panstock.api.dto.request.StockSaleRequest;
import com.panstock.api.dto.response.ExpirationItemResponse;
import com.panstock.api.dto.response.InventoryBatchResponse;
import com.panstock.api.dto.response.StockOperationResponse;
import com.panstock.api.dto.response.StockSummaryResponse;
import com.panstock.api.entity.*;
import com.panstock.api.enums.*;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.InventoryBatchMapper;
import com.panstock.api.mapper.StockMovementMapper;
import com.panstock.api.repository.*;
import com.panstock.api.repository.jpa.UserJpaRepository;
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
    private static final int    DEFAULT_EXPIRATION_ALERT_DAYS = 2;

    private final ProductRepository        productRepository;
    private final SupplierRepository       supplierRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository  stockMovementRepository;
    private final AppSettingRepository     appSettingRepository;
    private final UserJpaRepository        userRepository;

    // ── Entry ────────────────────────────────────────────────────────────────

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

        return InventoryBatchMapper.toResponse(savedBatch, calculateExpirationStatus(savedBatch.getExpirationDate()));
    }

    // ── Sale ─────────────────────────────────────────────────────────────────

    @Override
    public StockOperationResponse registerSale(StockSaleRequest request) {
        validatePositiveQuantity(request.quantity(), "La cantidad vendida debe ser mayor a cero.");

        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + request.productId()));

        validateProductCanMoveStock(product);

        User user = findUserIfPresent(request.userId());

        List<InventoryBatch> sellableBatches = inventoryBatchRepository.findSellableByProductId(product.getId());

        BigDecimal availableQuantity = sellableBatches.stream()
                .map(InventoryBatch::getCurrentQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (availableQuantity.compareTo(request.quantity()) < 0) {
            throw new BadRequestException("No hay stock suficiente para vender. Stock disponible: " + availableQuantity);
        }

        BigDecimal remainingQuantity = request.quantity();
        List<StockMovement> createdMovements = new ArrayList<>();

        for (InventoryBatch batch : sellableBatches) {
            if (remainingQuantity.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal toDiscount = batch.getCurrentQuantity().min(remainingQuantity);
            batch.setCurrentQuantity(batch.getCurrentQuantity().subtract(toDiscount));
            if (batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) == 0) {
                batch.setBatchStatus(BatchStatus.DEPLETED);
            }
            inventoryBatchRepository.save(batch);

            StockMovement movement = new StockMovement();
            movement.setProduct(product);
            movement.setBatch(batch);
            movement.setUser(user);
            movement.setMovementType(StockMovementType.SALE);
            movement.setQuantity(toDiscount);
            movement.setNotes("Venta manual" + (request.notes() != null ? ": " + request.notes() : ""));
            createdMovements.add(stockMovementRepository.save(movement));

            remainingQuantity = remainingQuantity.subtract(toDiscount);
        }

        return new StockOperationResponse(
                StockMovementType.SALE.name(),
                product.getId(), product.getName(), request.quantity(),
                createdMovements.stream().map(StockMovementMapper::toResponse).toList()
        );
    }

    // ── Adjustment ────────────────────────────────────────────────────────────

    @Override
    public StockOperationResponse registerAdjustment(StockAdjustmentRequest request) {
        validatePositiveQuantity(request.quantity(), "La cantidad del ajuste debe ser mayor a cero.");

        InventoryBatch batch = inventoryBatchRepository.findById(request.batchId())
                .orElseThrow(() -> new ResourceNotFoundException("Lote no encontrado con id " + request.batchId()));

        Product product = batch.getProduct();
        validateProductCanMoveStock(product);

        User user = findUserIfPresent(request.userId());

        if (batch.getBatchStatus() == BatchStatus.DISCARDED) {
            throw new BadRequestException("No se puede ajustar un lote descartado.");
        }

        StockMovementType movementType;

        if (request.adjustmentType() == StockAdjustmentType.IN) {
            batch.setCurrentQuantity(batch.getCurrentQuantity().add(request.quantity()));
            if (batch.getBatchStatus() == BatchStatus.DEPLETED) batch.setBatchStatus(BatchStatus.AVAILABLE);
            movementType = StockMovementType.ADJUSTMENT_IN;
        } else if (request.adjustmentType() == StockAdjustmentType.OUT) {
            if (batch.getCurrentQuantity().compareTo(request.quantity()) < 0) {
                throw new BadRequestException(
                        "No se puede descontar más stock del disponible. Disponible: " + batch.getCurrentQuantity());
            }
            batch.setCurrentQuantity(batch.getCurrentQuantity().subtract(request.quantity()));
            if (batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) == 0) batch.setBatchStatus(BatchStatus.DEPLETED);
            movementType = StockMovementType.ADJUSTMENT_OUT;
        } else {
            throw new BadRequestException("Tipo de ajuste inválido.");
        }

        inventoryBatchRepository.save(batch);

        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setBatch(batch);
        movement.setUser(user);
        movement.setMovementType(movementType);
        movement.setQuantity(request.quantity());
        movement.setNotes("Ajuste manual de stock" + (request.notes() != null ? ": " + request.notes() : ""));

        return new StockOperationResponse(
                movementType.name(), product.getId(), product.getName(), request.quantity(),
                List.of(StockMovementMapper.toResponse(stockMovementRepository.save(movement)))
        );
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<StockSummaryResponse> getStockSummary() {
        // Solo lotes de productos ACTIVOS
        List<InventoryBatch> batches = inventoryBatchRepository.findAvailableWithStock()
                .stream()
                .filter(b -> Boolean.TRUE.equals(b.getProduct().getActive()))
                .toList();

        Map<Long, StockAccumulator> grouped = new LinkedHashMap<>();
        for (InventoryBatch batch : batches) {
            Product p = batch.getProduct();
            grouped.putIfAbsent(p.getId(), new StockAccumulator(p.getId(), p.getName(), p.getOrigin(), p.getUnitType()));
            grouped.get(p.getId()).addBatch(batch);
        }
        return grouped.values().stream().map(StockAccumulator::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> getBatches() {
        return inventoryBatchRepository.findAll().stream()
                .map(b -> InventoryBatchMapper.toResponse(b, calculateExpirationStatus(b.getExpirationDate())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryBatchResponse getBatchById(Long id) {
        InventoryBatch batch = inventoryBatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lote no encontrado con id " + id));
        return InventoryBatchMapper.toResponse(batch, calculateExpirationStatus(batch.getExpirationDate()));
    }

    /**
     * Devuelve lotes con fecha de vencimiento de productos ACTIVOS que no están vencidos.
     *
     * - days == null  → todos (sin filtro de ventana). Lo usa el dashboard/semáforo.
     * - days == N     → solo los que vencen dentro de N días. Lo usa /api/stock/expiring?days=N.
     *
     * Orden: RED → YELLOW → GREEN, luego por fecha ascendente.
     */
    @Override
    @Transactional(readOnly = true)
    public List<ExpirationItemResponse> getExpiring(Integer days) {
        return inventoryBatchRepository.findAvailableWithStock().stream()
                .filter(b -> Boolean.TRUE.equals(b.getProduct().getActive()))  // ← solo activos
                .filter(b -> b.getExpirationDate() != null)
                .map(this::toExpirationItem)
                .filter(i -> i.status() != ExpirationStatus.EXPIRED)
                .filter(i -> {
                    if (days == null) return true;
                    return i.daysToExpire() != null && i.daysToExpire() >= 0 && i.daysToExpire() <= days;
                })
                .sorted(Comparator
                        .comparingInt((ExpirationItemResponse i) -> statusOrder(i.status()))
                        .thenComparingLong(i -> i.daysToExpire() != null ? i.daysToExpire() : Long.MAX_VALUE))
                .toList();
    }

    /**
     * Devuelve lotes vencidos de productos ACTIVOS.
     * (Los de productos inactivos ya fueron retirados de la venta — no hay acción posible.)
     */
    @Override
    @Transactional(readOnly = true)
    public List<ExpirationItemResponse> getExpired() {
        return inventoryBatchRepository.findAll().stream()
                .filter(b -> Boolean.TRUE.equals(b.getProduct().getActive()))  // ← solo activos
                .filter(b -> b.getExpirationDate() != null)
                .map(this::toExpirationItem)
                .filter(i -> i.status() == ExpirationStatus.EXPIRED)
                .sorted(Comparator.comparing(ExpirationItemResponse::expirationDate))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ExpirationStatus calculateExpirationStatus(LocalDate expirationDate) {
        if (expirationDate == null) return ExpirationStatus.NOT_APPLICABLE;

        long days = ChronoUnit.DAYS.between(LocalDate.now(), expirationDate);

        if (days < 0)  return ExpirationStatus.EXPIRED;
        if (days == 0) return ExpirationStatus.RED;
        if (days <= getExpirationAlertDays()) return ExpirationStatus.YELLOW;
        return ExpirationStatus.GREEN;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validateStockEntry(Product product, StockEntryRequest request) {
        validateProductCanMoveStock(product);
        if (request.quantity().compareTo(BigDecimal.ZERO) <= 0)
            throw new BadRequestException("La cantidad ingresada debe ser mayor a cero.");
        if (Boolean.TRUE.equals(product.getPerishable()) && request.expirationDate() == null)
            throw new BadRequestException("Los productos perecederos deben tener fecha de vencimiento.");
        if (request.expirationDate() != null && request.expirationDate().isBefore(request.receivedDate()))
            throw new BadRequestException("La fecha de vencimiento no puede ser anterior a la fecha de ingreso.");
    }

    private void validatePositiveQuantity(BigDecimal qty, String msg) {
        if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) throw new BadRequestException(msg);
    }

    private void validateProductCanMoveStock(Product product) {
        if (Boolean.FALSE.equals(product.getActive()))
            throw new BadRequestException("No se puede operar stock sobre un producto inactivo.");
    }

    private User findUserIfPresent(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id " + userId));
    }

    private ExpirationItemResponse toExpirationItem(InventoryBatch batch) {
        Long daysToExpire = batch.getExpirationDate() != null
                ? ChronoUnit.DAYS.between(LocalDate.now(), batch.getExpirationDate())
                : null;
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

    private int statusOrder(ExpirationStatus status) {
        return switch (status) {
            case EXPIRED -> 0;
            case RED     -> 1;
            case YELLOW  -> 2;
            case GREEN   -> 3;
            default      -> 4;
        };
    }

    private int getExpirationAlertDays() {
        return appSettingRepository.findBySettingKey(EXPIRATION_ALERT_DAYS_KEY)
                .map(AppSetting::getSettingValue)
                .map(Integer::parseInt)
                .orElse(DEFAULT_EXPIRATION_ALERT_DAYS);
    }

    // ── Inner accumulator ─────────────────────────────────────────────────────

    private static class StockAccumulator {
        private final Long productId;
        private final String productName;
        private final ProductOrigin origin;
        private final UnitType unitType;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private LocalDate nearestExpirationDate;

        StockAccumulator(Long productId, String productName, ProductOrigin origin, UnitType unitType) {
            this.productId = productId; this.productName = productName;
            this.origin = origin;       this.unitType = unitType;
        }

        void addBatch(InventoryBatch batch) {
            totalQuantity = totalQuantity.add(batch.getCurrentQuantity());
            LocalDate exp = batch.getExpirationDate();
            if (exp != null && (nearestExpirationDate == null || exp.isBefore(nearestExpirationDate)))
                nearestExpirationDate = exp;
        }

        StockSummaryResponse toResponse() {
            return new StockSummaryResponse(productId, productName, origin, unitType, totalQuantity, nearestExpirationDate);
        }
    }
}