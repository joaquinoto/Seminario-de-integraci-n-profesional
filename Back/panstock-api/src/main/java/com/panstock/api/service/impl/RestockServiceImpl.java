package com.panstock.api.service.impl;

import com.panstock.api.dto.response.RestockSuggestionResponse;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.Supplier;
import com.panstock.api.repository.InventoryBatchRepository;
import com.panstock.api.repository.ProductRepository;
import com.panstock.api.service.RestockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * RestockServiceImpl
 *
 * Lógica de reposición de stock para el rol OWNER.
 *
 * Horarios de pedido (reglas fijas de negocio):
 *   • D&D Panificados (id=8):              Lun–Vie 10:30–14:00 hs / Sáb 10:30–13:00 hs
 *   • Mayorista Gustavo Acuña (id=6):      Lun–Vie 09:00–19:00 hs
 *   • Productos de franquicia (FRANCHISE): Pedidos: martes, jueves y domingos
 *   • Resto de proveedores:               Lun–Vie 10:00–16:00 hs
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RestockServiceImpl implements RestockService {

    private final ProductRepository        productRepository;
    private final InventoryBatchRepository inventoryBatchRepository;

    // Supplier IDs with specific schedules
    private static final long SUPPLIER_DYD          = 8L;
    private static final long SUPPLIER_ACUNA         = 6L;

    @Override
    public List<RestockSuggestionResponse> getSuggestions() {

        // 1. Collect ALL batches to build stock totals & last-batch info
        List<InventoryBatch> allBatches = inventoryBatchRepository.findAll();

        // 2. Build per-product maps
        //    stockMap:      productId → total current stock (AVAILABLE, qty > 0)
        //    lastBatchMap:  productId → most recently received batch (by receivedDate)
        Map<Long, BigDecimal>       stockMap     = new HashMap<>();
        Map<Long, InventoryBatch>   lastBatchMap = new HashMap<>();

        for (InventoryBatch batch : allBatches) {
            Long pid = batch.getProduct().getId();

            // Accumulate available stock
            if (batch.getBatchStatus() != null
                    && batch.getBatchStatus().name().equals("AVAILABLE")
                    && batch.getCurrentQuantity() != null
                    && batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) > 0) {
                stockMap.merge(pid, batch.getCurrentQuantity(), BigDecimal::add);
            }

            // Track the latest received batch regardless of status (last order info)
            lastBatchMap.merge(pid, batch, (existing, newBatch) -> {
                if (newBatch.getReceivedDate() == null) return existing;
                if (existing.getReceivedDate() == null) return newBatch;
                return newBatch.getReceivedDate().isAfter(existing.getReceivedDate())
                        ? newBatch : existing;
            });
        }

        // 3. Find all active products with a defined minimumStock
        List<Product> activeProducts = productRepository.findActive();

        List<RestockSuggestionResponse> suggestions = new ArrayList<>();

        for (Product product : activeProducts) {
            if (product.getMinimumStock() == null
                    || product.getMinimumStock().compareTo(BigDecimal.ZERO) <= 0) {
                continue; // no minimum configured → skip
            }

            BigDecimal current = stockMap.getOrDefault(product.getId(), BigDecimal.ZERO);

            // Only suggest when stock is BELOW minimum
            if (current.compareTo(product.getMinimumStock()) >= 0) {
                continue;
            }

            // Compute percentage  (0 when no stock, capped at 99 when almost full)
            Integer pct = null;
            if (product.getMinimumStock().compareTo(BigDecimal.ZERO) > 0) {
                pct = current
                        .multiply(BigDecimal.valueOf(100))
                        .divide(product.getMinimumStock(), 0, RoundingMode.FLOOR)
                        .intValue();
            }

            // Last batch info
            InventoryBatch last     = lastBatchMap.get(product.getId());
            Supplier       supplier = resolveSupplier(product, last);

            suggestions.add(new RestockSuggestionResponse(
                    product.getId(),
                    product.getName(),
                    product.getCategory() != null ? product.getCategory().getName() : null,
                    product.getOrigin(),
                    product.getUnitType(),
                    current,
                    product.getMinimumStock(),
                    pct,
                    last != null ? last.getReceivedDate()    : null,
                    last != null ? last.getInitialQuantity() : null,
                    supplier != null ? supplier.getId()   : null,
                    supplier != null ? supplier.getName() : null,
                    buildSchedule(product, supplier)
            ));
        }

        // Sort: least stock-percentage first (most urgent at top), then by name
        suggestions.sort(Comparator
                .comparingInt((RestockSuggestionResponse r) -> r.stockPercentage() != null ? r.stockPercentage() : 0)
                .thenComparing(RestockSuggestionResponse::productName));

        return suggestions;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Resolves the effective supplier for the suggestion:
     * priority → last batch supplier → product default supplier.
     */
    private Supplier resolveSupplier(Product product, InventoryBatch lastBatch) {
        if (lastBatch != null && lastBatch.getSupplier() != null) {
            return lastBatch.getSupplier();
        }
        return product.getDefaultSupplier();
    }

    /**
     * Builds the human-readable order schedule string based on business rules.
     *
     * Rules (in priority order):
     *  1. Product origin is FRANCHISE  → "Pedidos: martes, jueves y domingos"
     *  2. Supplier id == 8 (D&D)       → "Lun–Vie 10:30–14:00 hs / Sáb 10:30–13:00 hs"
     *  3. Supplier id == 6 (Acuña)     → "Lun–Vie 09:00–19:00 hs"
     *  4. Any other supplier           → "Lun–Vie 10:00–16:00 hs"
     *  5. No supplier info             → "Consultar con el proveedor"
     */
    private String buildSchedule(Product product, Supplier supplier) {
        // Franchise products have their own fixed order days
        if (product.getOrigin() != null
                && product.getOrigin().name().equals("FRANCHISE")) {
            return "Pedidos: martes, jueves y domingos";
        }

        if (supplier == null) {
            return "Consultar con el proveedor";
        }

        long sid = supplier.getId();

        if (sid == SUPPLIER_DYD) {
            return "Lun-Vie 10:30-14:00 hs / Sáb 10:30-13:00 hs";
        }
        if (sid == SUPPLIER_ACUNA) {
            return "Lun-Vie 09:00-19:00 hs";
        }

        // Default for all other external/wholesale suppliers
        return "Lun-Vie 10:00-16:00 hs";
    }
}