package com.panstock.api.service.impl;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.entity.*;
import com.panstock.api.enums.BatchStatus;
import com.panstock.api.enums.StockMovementType;
import com.panstock.api.enums.WasteReason;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.WasteRecordMapper;
import com.panstock.api.repository.*;
import com.panstock.api.repository.jpa.UserJpaRepository;
import com.panstock.api.service.WasteRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WasteRecordServiceImpl implements WasteRecordService {

    private final InventoryBatchRepository inventoryBatchRepository;
    private final WasteRecordRepository    wasteRecordRepository;
    private final StockMovementRepository  stockMovementRepository;
    private final UserJpaRepository        userRepository;

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Override
    public WasteRecordResponse create(WasteRecordRequest request) {
        InventoryBatch batch = inventoryBatchRepository.findById(request.batchId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lote no encontrado con id " + request.batchId()));

        validateWasteRequest(batch, request);

        if (request.userId() == null) {
            throw new BadRequestException(
                    "Se requiere el id del usuario que registra la merma.");
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con id " + request.userId()));

        Product product       = batch.getProduct();
        BigDecimal unitCost      = batch.getUnitCost()      != null ? batch.getUnitCost()      : product.getCostPrice();
        BigDecimal unitSalePrice = batch.getUnitSalePrice() != null ? batch.getUnitSalePrice() : product.getSalePrice();
        if (unitSalePrice == null) unitSalePrice = BigDecimal.ZERO;

        BigDecimal economicLoss = request.quantity().multiply(unitSalePrice);

        WasteRecord wasteRecord = new WasteRecord();
        wasteRecord.setProduct(product);
        wasteRecord.setBatch(batch);
        wasteRecord.setCreatedBy(user);
        wasteRecord.setQuantity(request.quantity());
        wasteRecord.setReason(request.reason());
        wasteRecord.setUnitCost(unitCost);
        wasteRecord.setUnitSalePrice(unitSalePrice);
        wasteRecord.setEconomicLoss(economicLoss);
        wasteRecord.setNotes(request.notes());

        WasteRecord saved = wasteRecordRepository.save(wasteRecord);

        // Descontar stock del lote
        batch.setCurrentQuantity(batch.getCurrentQuantity().subtract(request.quantity()));
        if (batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) == 0) {
            batch.setBatchStatus(BatchStatus.DEPLETED);
        }
        inventoryBatchRepository.save(batch);

        // Movimiento de stock tipo WASTE
        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setBatch(batch);
        movement.setUser(user);
        movement.setMovementType(StockMovementType.WASTE);
        movement.setQuantity(request.quantity());
        movement.setRelatedWasteRecordId(saved.getId());
        movement.setNotes("Descuento por merma. Motivo: " + request.reason()
                + ". Registrado por: " + user.getFirstName() + " " + user.getLastName());
        stockMovementRepository.save(movement);

        return WasteRecordMapper.toResponse(saved);
    }

    // ── FIND ALL (con filtros) ─────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<WasteRecordResponse> findAll(
            LocalDate from,
            LocalDate to,
            Long categoryId,
            Long supplierId,
            WasteReason reason,
            Long createdById
    ) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay()                         : null;
        LocalDateTime toDt   = to   != null ? to.plusDays(1).atStartOfDay().minusNanos(1) : null;

        if (fromDt != null && toDt != null && toDt.isBefore(fromDt)) {
            throw new BadRequestException(
                    "La fecha hasta no puede ser anterior a la fecha desde.");
        }

        List<WasteRecord> records = wasteRecordRepository.search(fromDt, toDt, createdById);

        return records.stream()
                .filter(r -> categoryId == null
                        || (r.getProduct() != null
                            && r.getProduct().getCategory() != null
                            && r.getProduct().getCategory().getId().equals(categoryId)))
                .filter(r -> supplierId == null || matchesSupplier(r, supplierId))
                .filter(r -> reason == null || reason.equals(r.getReason()))
                .sorted((a, b) -> b.getWasteDate().compareTo(a.getWasteDate()))
                .map(WasteRecordMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ── FIND BY ID ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public WasteRecordResponse findById(Long id) {
        WasteRecord wasteRecord = wasteRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Merma no encontrada con id " + id));
        return WasteRecordMapper.toResponse(wasteRecord);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private boolean matchesSupplier(WasteRecord r, Long supplierId) {
        if (r.getBatch() != null && r.getBatch().getSupplier() != null) {
            return supplierId.equals(r.getBatch().getSupplier().getId());
        }
        if (r.getProduct() != null && r.getProduct().getDefaultSupplier() != null) {
            return supplierId.equals(r.getProduct().getDefaultSupplier().getId());
        }
        return false;
    }

    /**
     * Valida las reglas de negocio antes de registrar una merma.
     *
     * Reglas generales:
     *   - La cantidad debe ser mayor a cero
     *   - La cantidad no puede superar el stock del lote
     *   - El lote no puede estar DEPLETED ni DISCARDED
     *
     * Regla específica para motivo EXPIRED:
     *   - El lote DEBE tener fecha de vencimiento definida
     *   - La fecha de vencimiento DEBE ser anterior o igual a hoy
     *     (es decir, el lote debe estar efectivamente vencido)
     *   - Si el lote no está vencido, se lanza BadRequestException con
     *     mensaje claro para que el frontend lo muestre al usuario
     */
    private void validateWasteRequest(InventoryBatch batch, WasteRecordRequest request) {
        if (request.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException(
                    "La cantidad de merma debe ser mayor a cero.");
        }
        if (batch.getCurrentQuantity().compareTo(request.quantity()) < 0) {
            throw new BadRequestException(
                    "No se puede registrar una merma mayor al stock disponible del lote. "
                    + "Stock actual: " + batch.getCurrentQuantity() + ".");
        }
        if (batch.getBatchStatus() == BatchStatus.DEPLETED
                || batch.getBatchStatus() == BatchStatus.DISCARDED) {
            throw new BadRequestException(
                    "No se puede registrar merma sobre un lote sin stock disponible.");
        }

        // Validación específica para motivo EXPIRED:
        // el lote debe estar efectivamente vencido a la fecha de hoy.
        if (request.reason() == WasteReason.EXPIRED) {
            if (batch.getExpirationDate() == null) {
                throw new BadRequestException(
                        "El lote seleccionado no tiene fecha de vencimiento registrada. "
                        + "Para registrar una merma por vencimiento, el lote debe tener "
                        + "fecha de vencimiento y ésta debe ser anterior o igual a la fecha actual.");
            }
            if (batch.getExpirationDate().isAfter(LocalDate.now())) {
                throw new BadRequestException(
                        "El lote seleccionado no está vencido (vence el "
                        + batch.getExpirationDate() + "). "
                        + "El motivo 'Vencido' solo puede usarse con lotes cuya fecha de "
                        + "vencimiento sea anterior o igual a la fecha actual.");
            }
        }
    }
}