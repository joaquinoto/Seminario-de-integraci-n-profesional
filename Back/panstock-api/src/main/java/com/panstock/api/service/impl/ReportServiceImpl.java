package com.panstock.api.service.impl;

import com.panstock.api.dto.response.*;
import com.panstock.api.entity.*;
import com.panstock.api.enums.*;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.repository.InventoryBatchRepository;
import com.panstock.api.repository.StockMovementRepository;
import com.panstock.api.repository.WasteRecordRepository;
import com.panstock.api.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final WasteRecordRepository    wasteRecordRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final StockMovementRepository  stockMovementRepository;

    @Override
    public WasteSummaryReportResponse getWasteSummary(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        BigDecimal totalQuantity    = sumQuantity(records);
        BigDecimal totalEconomicLoss = sumEconomicLoss(records);

        return new WasteSummaryReportResponse(
                range.fromDate(), range.toDate(),
                (long) records.size(), totalQuantity, totalEconomicLoss
        );
    }

    @Override
    public EconomicLossReportResponse getEconomicLoss(LocalDate from, LocalDate to) {
        DateRange range   = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        BigDecimal totalEconomicLoss = sumEconomicLoss(records);
        BigDecimal averageLoss = BigDecimal.ZERO;
        if (!records.isEmpty()) {
            averageLoss = totalEconomicLoss.divide(
                    BigDecimal.valueOf(records.size()), 2, RoundingMode.HALF_UP);
        }

        return new EconomicLossReportResponse(
                range.fromDate(), range.toDate(),
                totalEconomicLoss, averageLoss, (long) records.size()
        );
    }

    @Override
    public List<WasteByCategoryResponse> getWasteByCategory(LocalDate from, LocalDate to) {
        DateRange range   = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        Map<Long, WasteByCategoryAccumulator> grouped = new LinkedHashMap<>();
        for (WasteRecord record : records) {
            Product product       = record.getProduct();
            ProductCategory category = product.getCategory();
            Long categoryId       = category.getId();
            grouped.putIfAbsent(categoryId, new WasteByCategoryAccumulator(categoryId, category.getName()));
            grouped.get(categoryId).add(record);
        }

        return grouped.values().stream()
                .map(WasteByCategoryAccumulator::toResponse)
                .sorted(Comparator.comparing(WasteByCategoryResponse::totalEconomicLoss).reversed())
                .toList();
    }

    @Override
    public List<WasteBySupplierResponse> getWasteBySupplier(LocalDate from, LocalDate to) {
        DateRange range   = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        Map<String, WasteBySupplierAccumulator> grouped = new LinkedHashMap<>();
        for (WasteRecord record : records) {
            Supplier supplier = resolveSupplier(record);
            Long supplierId   = supplier != null ? supplier.getId() : null;
            String supplierName = supplier != null ? supplier.getName() : "Sin proveedor";
            String key        = supplierId != null ? supplierId.toString() : "NO_SUPPLIER";
            grouped.putIfAbsent(key, new WasteBySupplierAccumulator(supplierId, supplierName));
            grouped.get(key).add(record);
        }

        return grouped.values().stream()
                .map(WasteBySupplierAccumulator::toResponse)
                .sorted(Comparator.comparing(WasteBySupplierResponse::totalEconomicLoss).reversed())
                .toList();
    }

    @Override
    public List<StockStatusReportResponse> getStockStatus() {
        List<InventoryBatch> batches    = inventoryBatchRepository.findAvailableWithStock();
        List<InventoryBatch> allBatches = inventoryBatchRepository.findAll();

        Map<Long, StockStatusAccumulator> grouped = new LinkedHashMap<>();
        for (InventoryBatch batch : allBatches) {
            Product product = batch.getProduct();
            grouped.putIfAbsent(product.getId(), new StockStatusAccumulator(product));
        }
        for (InventoryBatch batch : batches) {
            Product product = batch.getProduct();
            if (grouped.containsKey(product.getId())) {
                grouped.get(product.getId()).addBatch(batch);
            }
        }

        return grouped.values().stream()
                .map(StockStatusAccumulator::toResponse)
                .sorted(Comparator.comparing(StockStatusReportResponse::productName))
                .toList();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SALES REPORTS (new)
    // ══════════════════════════════════════════════════════════════════════════

    @Override
    public SalesReportResponse getSalesSummary(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<StockMovement> sales = findSaleMovements(range);

        BigDecimal totalQty     = sales.stream()
                .map(StockMovement::getQuantity)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRevenue = sales.stream()
                .filter(m -> m.getUnitSalePrice() != null && m.getQuantity() != null)
                .map(m -> m.getUnitSalePrice().multiply(m.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgRevenue = BigDecimal.ZERO;
        if (!sales.isEmpty()) {
            avgRevenue = totalRevenue.divide(
                    BigDecimal.valueOf(sales.size()), 2, RoundingMode.HALF_UP);
        }

        return new SalesReportResponse(
                range.fromDate(), range.toDate(),
                (long) sales.size(),
                totalQty,
                totalRevenue,
                avgRevenue
        );
    }

    @Override
    public List<SalesByProductResponse> getSalesByProduct(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<StockMovement> sales = findSaleMovements(range);

        Map<Long, SalesByProductAccumulator> grouped = new LinkedHashMap<>();
        for (StockMovement m : sales) {
            Product product = m.getProduct();
            if (product == null) continue;
            Long pid = product.getId();

            String categoryName = product.getCategory() != null
                    ? product.getCategory().getName() : "Sin categoría";

            grouped.putIfAbsent(pid, new SalesByProductAccumulator(
                    pid, product.getName(), categoryName));
            grouped.get(pid).add(m);
        }

        return grouped.values().stream()
                .map(SalesByProductAccumulator::toResponse)
                .sorted(Comparator.comparing(SalesByProductResponse::totalRevenue).reversed())
                .toList();
    }

    @Override
    public List<SalesByCategoryResponse> getSalesByCategory(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<StockMovement> sales = findSaleMovements(range);

        Map<Long, SalesByCategoryAccumulator> grouped = new LinkedHashMap<>();
        for (StockMovement m : sales) {
            Product product = m.getProduct();
            if (product == null || product.getCategory() == null) continue;
            ProductCategory cat = product.getCategory();
            Long catId = cat.getId();

            grouped.putIfAbsent(catId, new SalesByCategoryAccumulator(catId, cat.getName()));
            grouped.get(catId).add(m);
        }

        return grouped.values().stream()
                .map(SalesByCategoryAccumulator::toResponse)
                .sorted(Comparator.comparing(SalesByCategoryResponse::totalRevenue).reversed())
                .toList();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STOCK BALANCE REPORT (new)
    // ══════════════════════════════════════════════════════════════════════════

    @Override
    public StockBalanceResponse getStockBalance(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);

        // ENTRY movements in period
        BigDecimal totalEntered = findMovementsByType(range, StockMovementType.ENTRY)
                .stream()
                .map(StockMovement::getQuantity)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // SALE movements in period
        BigDecimal totalSold = findMovementsByType(range, StockMovementType.SALE)
                .stream()
                .map(StockMovement::getQuantity)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // WASTE movements in period
        BigDecimal totalWasted = findMovementsByType(range, StockMovementType.WASTE)
                .stream()
                .map(StockMovement::getQuantity)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Remaining = entered - sold - wasted
        BigDecimal remaining = totalEntered
                .subtract(totalSold)
                .subtract(totalWasted);
        if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

        // Rates
        BigDecimal efficiencyRate = BigDecimal.ZERO;
        BigDecimal wasteRate      = BigDecimal.ZERO;
        BigDecimal sellThrough    = BigDecimal.ZERO;

        if (totalEntered.compareTo(BigDecimal.ZERO) > 0) {
            efficiencyRate = totalSold.divide(totalEntered, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            wasteRate = totalWasted.divide(totalEntered, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal usedStock = totalSold.add(totalWasted);
            sellThrough = usedStock.divide(totalEntered, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return new StockBalanceResponse(
                range.fromDate(), range.toDate(),
                totalEntered, totalSold, totalWasted, remaining,
                efficiencyRate, wasteRate, sellThrough
        );
    }

    @Override
    public List<StockBalanceByProductResponse> getStockBalanceByProduct(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);

        List<StockMovement> allMovements = stockMovementRepository.search(
                null, null, null,
                range.fromDateTime(), range.toDateTime());

        Map<Long, BalanceByProductAccumulator> grouped = new LinkedHashMap<>();

        for (StockMovement m : allMovements) {
            Product product = m.getProduct();
            if (product == null) continue;
            Long pid = product.getId();

            String categoryName = product.getCategory() != null
                    ? product.getCategory().getName() : "Sin categoría";

            grouped.putIfAbsent(pid, new BalanceByProductAccumulator(
                    pid,
                    product.getName(),
                    categoryName,
                    product.getOrigin() != null ? product.getOrigin().name() : "EXTERNAL",
                    product.getUnitType() != null ? product.getUnitType().name() : "UNIT"
            ));
            grouped.get(pid).add(m);
        }

        return grouped.values().stream()
                .map(BalanceByProductAccumulator::toResponse)
                .filter(r -> r.totalEntered().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(StockBalanceByProductResponse::totalEntered).reversed())
                .toList();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    private List<WasteRecord> findWasteRecords(DateRange range) {
        return wasteRecordRepository.findByWasteDateBetween(range.fromDateTime(), range.toDateTime());
    }

    private List<StockMovement> findSaleMovements(DateRange range) {
        return stockMovementRepository.search(
                null, null, StockMovementType.SALE,
                range.fromDateTime(), range.toDateTime());
    }

    private List<StockMovement> findMovementsByType(DateRange range, StockMovementType type) {
        return stockMovementRepository.search(
                null, null, type,
                range.fromDateTime(), range.toDateTime());
    }

    private DateRange validateAndBuildRange(LocalDate from, LocalDate to) {
        if (from == null) throw new BadRequestException("La fecha desde es obligatoria.");
        if (to   == null) throw new BadRequestException("La fecha hasta es obligatoria.");
        if (to.isBefore(from)) throw new BadRequestException("La fecha hasta no puede ser anterior a la fecha desde.");

        LocalDateTime fromDT = from.atStartOfDay();
        LocalDateTime toDT   = to.plusDays(1).atStartOfDay().minusNanos(1);
        return new DateRange(from, to, fromDT, toDT);
    }

    private BigDecimal sumQuantity(List<WasteRecord> records) {
        return records.stream()
                .map(WasteRecord::getQuantity)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumEconomicLoss(List<WasteRecord> records) {
        return records.stream()
                .map(WasteRecord::getEconomicLoss)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Supplier resolveSupplier(WasteRecord record) {
        if (record.getBatch() != null && record.getBatch().getSupplier() != null) {
            return record.getBatch().getSupplier();
        }
        if (record.getProduct() != null) {
            return record.getProduct().getDefaultSupplier();
        }
        return null;
    }

    // ── Inner record ──────────────────────────────────────────────────────────
    private record DateRange(
            LocalDate fromDate, LocalDate toDate,
            LocalDateTime fromDateTime, LocalDateTime toDateTime
    ) {}

    // ── Waste accumulators ────────────────────────────────────────────────────
    private static class WasteByCategoryAccumulator {
        private final Long categoryId;
        private final String categoryName;
        private long wasteRecordsCount = 0;
        private BigDecimal totalQuantity    = BigDecimal.ZERO;
        private BigDecimal totalEconomicLoss = BigDecimal.ZERO;

        WasteByCategoryAccumulator(Long id, String name) { this.categoryId = id; this.categoryName = name; }

        void add(WasteRecord r) {
            wasteRecordsCount++;
            totalQuantity    = totalQuantity.add(r.getQuantity());
            totalEconomicLoss = totalEconomicLoss.add(r.getEconomicLoss());
        }

        WasteByCategoryResponse toResponse() {
            return new WasteByCategoryResponse(
                    categoryId, categoryName, wasteRecordsCount, totalQuantity, totalEconomicLoss);
        }
    }

    private static class WasteBySupplierAccumulator {
        private final Long supplierId;
        private final String supplierName;
        private long wasteRecordsCount = 0;
        private BigDecimal totalQuantity    = BigDecimal.ZERO;
        private BigDecimal totalEconomicLoss = BigDecimal.ZERO;

        WasteBySupplierAccumulator(Long id, String name) { this.supplierId = id; this.supplierName = name; }

        void add(WasteRecord r) {
            wasteRecordsCount++;
            totalQuantity    = totalQuantity.add(r.getQuantity());
            totalEconomicLoss = totalEconomicLoss.add(r.getEconomicLoss());
        }

        WasteBySupplierResponse toResponse() {
            return new WasteBySupplierResponse(
                    supplierId, supplierName, wasteRecordsCount, totalQuantity, totalEconomicLoss);
        }
    }

    // ── Sales accumulators ────────────────────────────────────────────────────
    private static class SalesByProductAccumulator {
        private final Long productId;
        private final String productName;
        private final String categoryName;
        private long movementsCount = 0;
        private BigDecimal totalQty     = BigDecimal.ZERO;
        private BigDecimal totalRevenue = BigDecimal.ZERO;

        SalesByProductAccumulator(Long id, String name, String cat) {
            this.productId = id; this.productName = name; this.categoryName = cat;
        }

        void add(StockMovement m) {
            movementsCount++;
            if (m.getQuantity() != null) totalQty = totalQty.add(m.getQuantity());
            if (m.getUnitSalePrice() != null && m.getQuantity() != null) {
                totalRevenue = totalRevenue.add(m.getUnitSalePrice().multiply(m.getQuantity()));
            }
        }

        SalesByProductResponse toResponse() {
            BigDecimal avgPrice = BigDecimal.ZERO;
            if (totalQty.compareTo(BigDecimal.ZERO) > 0) {
                avgPrice = totalRevenue.divide(totalQty, 2, RoundingMode.HALF_UP);
            }
            return new SalesByProductResponse(
                    productId, productName, categoryName,
                    movementsCount, totalQty, totalRevenue, avgPrice);
        }
    }

    private static class SalesByCategoryAccumulator {
        private final Long categoryId;
        private final String categoryName;
        private long movementsCount = 0;
        private BigDecimal totalQty     = BigDecimal.ZERO;
        private BigDecimal totalRevenue = BigDecimal.ZERO;

        SalesByCategoryAccumulator(Long id, String name) { this.categoryId = id; this.categoryName = name; }

        void add(StockMovement m) {
            movementsCount++;
            if (m.getQuantity() != null) totalQty = totalQty.add(m.getQuantity());
            if (m.getUnitSalePrice() != null && m.getQuantity() != null) {
                totalRevenue = totalRevenue.add(m.getUnitSalePrice().multiply(m.getQuantity()));
            }
        }

        SalesByCategoryResponse toResponse() {
            return new SalesByCategoryResponse(
                    categoryId, categoryName, movementsCount, totalQty, totalRevenue);
        }
    }

    // ── Balance accumulator ───────────────────────────────────────────────────
    private static class BalanceByProductAccumulator {
        private final Long productId;
        private final String productName;
        private final String categoryName;
        private final String origin;
        private final String unitType;
        private BigDecimal totalEntered = BigDecimal.ZERO;
        private BigDecimal totalSold    = BigDecimal.ZERO;
        private BigDecimal totalWasted  = BigDecimal.ZERO;

        BalanceByProductAccumulator(Long id, String name, String cat, String origin, String unit) {
            this.productId = id; this.productName = name; this.categoryName = cat;
            this.origin = origin; this.unitType = unit;
        }

        void add(StockMovement m) {
            if (m.getQuantity() == null) return;
            BigDecimal qty = m.getQuantity();
            if (m.getMovementType() == StockMovementType.ENTRY)
                totalEntered = totalEntered.add(qty);
            else if (m.getMovementType() == StockMovementType.SALE)
                totalSold = totalSold.add(qty);
            else if (m.getMovementType() == StockMovementType.WASTE)
                totalWasted = totalWasted.add(qty);
        }

        StockBalanceByProductResponse toResponse() {
            BigDecimal remaining = totalEntered.subtract(totalSold).subtract(totalWasted);
            if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

            BigDecimal efficiencyRate = BigDecimal.ZERO;
            BigDecimal wasteRate      = BigDecimal.ZERO;
            if (totalEntered.compareTo(BigDecimal.ZERO) > 0) {
                efficiencyRate = totalSold.divide(totalEntered, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
                wasteRate = totalWasted.divide(totalEntered, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
            }

            return new StockBalanceByProductResponse(
                    productId, productName, categoryName, origin, unitType,
                    totalEntered, totalSold, totalWasted, remaining,
                    efficiencyRate, wasteRate);
        }
    }

    // ── Stock status accumulator ──────────────────────────────────────────────
    private static class StockStatusAccumulator {
        private final Product product;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private LocalDate nearestExpirationDate;

        StockStatusAccumulator(Product product) { this.product = product; }

        void addBatch(InventoryBatch batch) {
            if (batch.getCurrentQuantity() != null)
                totalQuantity = totalQuantity.add(batch.getCurrentQuantity());
            LocalDate exp = batch.getExpirationDate();
            if (exp != null && batch.getCurrentQuantity() != null
                    && batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) > 0) {
                if (nearestExpirationDate == null || exp.isBefore(nearestExpirationDate))
                    nearestExpirationDate = exp;
            }
        }

        StockStatusReportResponse toResponse() {
            return new StockStatusReportResponse(
                    product.getId(), product.getName(),
                    product.getOrigin(),
                    product.getCategory().getName(),
                    product.getUnitType(),
                    totalQuantity,
                    product.getMinimumStock(),
                    nearestExpirationDate,
                    calculateStockStatus());
        }

        private String calculateStockStatus() {
            if (totalQuantity.compareTo(BigDecimal.ZERO) == 0)   return "OUT_OF_STOCK";
            if (product.getMinimumStock() == null)               return "WITHOUT_MINIMUM_STOCK";
            if (totalQuantity.compareTo(product.getMinimumStock()) < 0) return "LOW_STOCK";
            return "OK";
        }
    }
}
