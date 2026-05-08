package com.panstock.api.service.impl;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.entity.*;
import com.panstock.api.enums.BatchStatus;
import com.panstock.api.enums.StockMovementType;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.WasteRecordMapper;
import com.panstock.api.repository.*;
import com.panstock.api.service.WasteRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class WasteRecordServiceImpl implements WasteRecordService {

    private final InventoryBatchRepository inventoryBatchRepository;
    private final WasteRecordRepository wasteRecordRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;

    @Override
    public WasteRecordResponse create(WasteRecordRequest request) {
        InventoryBatch batch = inventoryBatchRepository.findById(request.batchId())
                .orElseThrow(() -> new ResourceNotFoundException("Lote no encontrado con id " + request.batchId()));

        validateWasteRequest(batch, request);

        User user = null;
        if (request.userId() != null) {
            user = userRepository.findById(request.userId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id " + request.userId()));
        }

        Product product = batch.getProduct();

        BigDecimal unitCost = batch.getUnitCost() != null ? batch.getUnitCost() : product.getCostPrice();
        BigDecimal unitSalePrice = batch.getUnitSalePrice() != null ? batch.getUnitSalePrice() : product.getSalePrice();

        if (unitSalePrice == null) {
            unitSalePrice = BigDecimal.ZERO;
        }

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

        WasteRecord savedWasteRecord = wasteRecordRepository.save(wasteRecord);

        batch.setCurrentQuantity(batch.getCurrentQuantity().subtract(request.quantity()));

        if (batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) == 0) {
            batch.setBatchStatus(BatchStatus.DEPLETED);
        }

        inventoryBatchRepository.save(batch);

        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setBatch(batch);
        movement.setUser(user);
        movement.setMovementType(StockMovementType.WASTE);
        movement.setQuantity(request.quantity());
        movement.setRelatedWasteRecordId(savedWasteRecord.getId());
        movement.setNotes("Descuento por merma. Motivo: " + request.reason());

        stockMovementRepository.save(movement);

        return WasteRecordMapper.toResponse(savedWasteRecord);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WasteRecordResponse> findAll() {
        return wasteRecordRepository.findAll()
                .stream()
                .map(WasteRecordMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public WasteRecordResponse findById(Long id) {
        WasteRecord wasteRecord = wasteRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merma no encontrada con id " + id));

        return WasteRecordMapper.toResponse(wasteRecord);
    }

    private void validateWasteRequest(InventoryBatch batch, WasteRecordRequest request) {
        if (request.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("La cantidad de merma debe ser mayor a cero.");
        }

        if (batch.getCurrentQuantity().compareTo(request.quantity()) < 0) {
            throw new BadRequestException("No se puede registrar una merma mayor al stock disponible del lote.");
        }

        if (batch.getBatchStatus() == BatchStatus.DEPLETED || batch.getBatchStatus() == BatchStatus.DISCARDED) {
            throw new BadRequestException("No se puede registrar merma sobre un lote sin stock disponible.");
        }
    }
}