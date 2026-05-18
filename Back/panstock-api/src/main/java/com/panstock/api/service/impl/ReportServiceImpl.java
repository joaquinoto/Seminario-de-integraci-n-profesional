package com.panstock.api.service.impl;

import com.panstock.api.dto.response.*;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.ProductCategory;
import com.panstock.api.entity.Supplier;
import com.panstock.api.entity.WasteRecord;
import com.panstock.api.enums.BatchStatus;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.repository.InventoryBatchRepository;
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

    private final WasteRecordRepository wasteRecordRepository;
    private final InventoryBatchRepository inventoryBatchRepository;

    @Override
    public WasteSummaryReportResponse getWasteSummary(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        BigDecimal totalQuantity = sumQuantity(records);
        BigDecimal totalEconomicLoss = sumEconomicLoss(records);

        return new WasteSummaryReportResponse(
                range.fromDate(),
                range.toDate(),
                (long) records.size(),
                totalQuantity,
                totalEconomicLoss
        );
    }

    @Override
    public EconomicLossReportResponse getEconomicLoss(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        BigDecimal totalEconomicLoss = sumEconomicLoss(records);

        BigDecimal averageLoss = BigDecimal.ZERO;
        if (!records.isEmpty()) {
            averageLoss = totalEconomicLoss.divide(
                    BigDecimal.valueOf(records.size()),
                    2,
                    RoundingMode.HALF_UP
            );
        }

        return new EconomicLossReportResponse(
                range.fromDate(),
                range.toDate(),
                totalEconomicLoss,
                averageLoss,
                (long) records.size()
        );
    }

    @Override
    public List<WasteByCategoryResponse> getWasteByCategory(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        Map<Long, WasteByCategoryAccumulator> grouped = new LinkedHashMap<>();

        for (WasteRecord record : records) {
            Product product = record.getProduct();
            ProductCategory category = product.getCategory();
            Long categoryId = category.getId();

            grouped.putIfAbsent(categoryId, new WasteByCategoryAccumulator(categoryId, category.getName()));
            grouped.get(categoryId).add(record);
        }

        return grouped.values()
                .stream()
                .map(WasteByCategoryAccumulator::toResponse)
                .sorted(Comparator.comparing(WasteByCategoryResponse::totalEconomicLoss).reversed())
                .toList();
    }

    @Override
    public List<WasteBySupplierResponse> getWasteBySupplier(LocalDate from, LocalDate to) {
        DateRange range = validateAndBuildRange(from, to);
        List<WasteRecord> records = findWasteRecords(range);

        Map<String, WasteBySupplierAccumulator> grouped = new LinkedHashMap<>();

        for (WasteRecord record : records) {
            Supplier supplier = resolveSupplier(record);
            Long supplierId = supplier != null ? supplier.getId() : null;
            String supplierName = supplier != null ? supplier.getName() : "Sin proveedor";
            String key = supplierId != null ? supplierId.toString() : "NO_SUPPLIER";

            grouped.putIfAbsent(key, new WasteBySupplierAccumulator(supplierId, supplierName));
            grouped.get(key).add(record);
        }

        return grouped.values()
                .stream()
                .map(WasteBySupplierAccumulator::toResponse)
                .sorted(Comparator.comparing(WasteBySupplierResponse::totalEconomicLoss).reversed())
                .toList();
    }

    @Override
    public List<StockStatusReportResponse> getStockStatus() {
        // CORREGIDO: se usa findAvailableWithStock() en lugar de findAll()
        // para no inflar el stock con lotes DEPLETED o DISCARDED
        List<InventoryBatch> batches = inventoryBatchRepository.findAvailableWithStock();

        // También necesitamos los productos sin stock para mostrarlos como OUT_OF_STOCK
        // Para eso obtenemos todos y los que no están en available los agregamos con qty=0
        List<InventoryBatch> allBatches = inventoryBatchRepository.findAll();

        Map<Long, StockStatusAccumulator> grouped = new LinkedHashMap<>();

        // Primero registramos todos los productos (para capturar los OUT_OF_STOCK)
        for (InventoryBatch batch : allBatches) {
            Product product = batch.getProduct();
            grouped.putIfAbsent(product.getId(), new StockStatusAccumulator(product));
        }

        // Luego sumamos solo los lotes disponibles con stock
        for (InventoryBatch batch : batches) {
            Product product = batch.getProduct();
            if (grouped.containsKey(product.getId())) {
                grouped.get(product.getId()).addBatch(batch);
            }
        }

        return grouped.values()
                .stream()
                .map(StockStatusAccumulator::toResponse)
                .sorted(Comparator.comparing(StockStatusReportResponse::productName))
                .toList();
    }

    private List<WasteRecord> findWasteRecords(DateRange range) {
        return wasteRecordRepository.findByWasteDateBetween(range.fromDateTime(), range.toDateTime());
    }

    private DateRange validateAndBuildRange(LocalDate from, LocalDate to) {
        if (from == null) throw new BadRequestException("La fecha desde es obligatoria.");
        if (to == null) throw new BadRequestException("La fecha hasta es obligatoria.");
        if (to.isBefore(from)) throw new BadRequestException("La fecha hasta no puede ser anterior a la fecha desde.");

        LocalDateTime fromDateTime = from.atStartOfDay();
        LocalDateTime toDateTime = to.plusDays(1).atStartOfDay().minusNanos(1);

        return new DateRange(from, to, fromDateTime, toDateTime);
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

    private record DateRange(
            LocalDate fromDate,
            LocalDate toDate,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    ) {}

    private static class WasteByCategoryAccumulator {
        private final Long categoryId;
        private final String categoryName;
        private long wasteRecordsCount = 0;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private BigDecimal totalEconomicLoss = BigDecimal.ZERO;

        private WasteByCategoryAccumulator(Long categoryId, String categoryName) {
            this.categoryId = categoryId;
            this.categoryName = categoryName;
        }

        private void add(WasteRecord record) {
            wasteRecordsCount++;
            totalQuantity = totalQuantity.add(record.getQuantity());
            totalEconomicLoss = totalEconomicLoss.add(record.getEconomicLoss());
        }

        private WasteByCategoryResponse toResponse() {
            return new WasteByCategoryResponse(categoryId, categoryName, wasteRecordsCount, totalQuantity, totalEconomicLoss);
        }
    }

    private static class WasteBySupplierAccumulator {
        private final Long supplierId;
        private final String supplierName;
        private long wasteRecordsCount = 0;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private BigDecimal totalEconomicLoss = BigDecimal.ZERO;

        private WasteBySupplierAccumulator(Long supplierId, String supplierName) {
            this.supplierId = supplierId;
            this.supplierName = supplierName;
        }

        private void add(WasteRecord record) {
            wasteRecordsCount++;
            totalQuantity = totalQuantity.add(record.getQuantity());
            totalEconomicLoss = totalEconomicLoss.add(record.getEconomicLoss());
        }

        private WasteBySupplierResponse toResponse() {
            return new WasteBySupplierResponse(supplierId, supplierName, wasteRecordsCount, totalQuantity, totalEconomicLoss);
        }
    }

    private static class StockStatusAccumulator {
        private final Product product;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private LocalDate nearestExpirationDate;

        private StockStatusAccumulator(Product product) {
            this.product = product;
        }

        // Solo se llama con lotes AVAILABLE con stock > 0
        private void addBatch(InventoryBatch batch) {
            if (batch.getCurrentQuantity() != null) {
                totalQuantity = totalQuantity.add(batch.getCurrentQuantity());
            }
            LocalDate expirationDate = batch.getExpirationDate();
            if (expirationDate != null && batch.getCurrentQuantity() != null
                    && batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) > 0) {
                if (nearestExpirationDate == null || expirationDate.isBefore(nearestExpirationDate)) {
                    nearestExpirationDate = expirationDate;
                }
            }
        }

        private StockStatusReportResponse toResponse() {
            return new StockStatusReportResponse(
                    product.getId(),
                    product.getName(),
                    product.getOrigin(),
                    product.getCategory().getName(),
                    product.getUnitType(),
                    totalQuantity,
                    product.getMinimumStock(),
                    nearestExpirationDate,
                    calculateStockStatus()
            );
        }

        private String calculateStockStatus() {
            if (totalQuantity.compareTo(BigDecimal.ZERO) == 0) return "OUT_OF_STOCK";
            if (product.getMinimumStock() == null) return "WITHOUT_MINIMUM_STOCK";
            if (totalQuantity.compareTo(product.getMinimumStock()) < 0) return "LOW_STOCK";
            return "OK";
        }
    }
}