package com.panstock.api.service.impl;

import com.panstock.api.dto.response.StockMovementHistoryResponse;
import com.panstock.api.entity.StockMovement;
import com.panstock.api.enums.StockMovementType;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.StockMovementMapper;
import com.panstock.api.repository.StockMovementRepository;
import com.panstock.api.service.StockMovementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockMovementServiceImpl implements StockMovementService {

    private final StockMovementRepository stockMovementRepository;

    @Override
    public List<StockMovementHistoryResponse> findAll(
            Long productId,
            Long batchId,
            StockMovementType movementType,
            LocalDate from,
            LocalDate to
    ) {
        validateDateRange(from, to);

        LocalDateTime fromDateTime = from != null
                ? from.atStartOfDay()
                : null;

        LocalDateTime toDateTime = to != null
                ? to.plusDays(1).atStartOfDay().minusNanos(1)
                : null;

        return stockMovementRepository.search(
                        productId,
                        batchId,
                        movementType,
                        fromDateTime,
                        toDateTime
                )
                .stream()
                .map(StockMovementMapper::toHistoryResponse)
                .toList();
    }

    @Override
    public StockMovementHistoryResponse findById(Long id) {
        StockMovement movement = stockMovementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimiento de stock no encontrado con id " + id));

        return StockMovementMapper.toHistoryResponse(movement);
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new BadRequestException("La fecha hasta no puede ser anterior a la fecha desde.");
        }
    }
}