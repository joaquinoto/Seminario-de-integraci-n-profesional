package com.panstock.api.service.impl;

import com.panstock.api.dto.request.PromotionRequest;
import com.panstock.api.dto.response.PromotionResponse;
import com.panstock.api.dto.response.PromotionSuggestionResponse;
import com.panstock.api.entity.*;
import com.panstock.api.enums.DiscountType;
import com.panstock.api.enums.ExpirationStatus;
import com.panstock.api.enums.PromotionStatus;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.PromotionMapper;
import com.panstock.api.repository.*;
import com.panstock.api.repository.jpa.UserJpaRepository;
import com.panstock.api.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PromotionServiceImpl implements PromotionService {

    private static final String PROMOTION_SUGGESTION_DAYS_KEY    = "promotion_suggestion_days";
    private static final int    DEFAULT_PROMOTION_SUGGESTION_DAYS = 2;

    // Zona horaria del negocio
    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final PromotionRepository      promotionRepository;
    private final ProductRepository        productRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final UserJpaRepository        userRepository;
    private final AppSettingRepository     appSettingRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/promotions/suggestions
    // Solo OWNER. Devuelve lotes con stock disponible, próximos a vencer,
    // sin promoción activa ya creada.
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public List<PromotionSuggestionResponse> getSuggestions() {
        int suggestionDays = getPromotionSuggestionDays();

        return inventoryBatchRepository.findAvailableWithStock()
                .stream()
                // Solo lotes con fecha de vencimiento
                .filter(batch -> batch.getExpirationDate() != null)
                // Solo lotes que no han vencido aún
                .filter(batch -> !batch.getExpirationDate().isBefore(LocalDate.now(ZONE)))
                // Solo dentro del rango de días de sugerencia
                .filter(batch -> {
                    long days = ChronoUnit.DAYS.between(LocalDate.now(ZONE), batch.getExpirationDate());
                    return days >= 0 && days <= suggestionDays;
                })
                // Solo lotes sin promoción activa
                .filter(batch -> !promotionRepository.existsActiveByBatchId(batch.getId()))
                .map(this::toSuggestion)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/promotions
    // Solo OWNER. Crea la promoción.
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    public PromotionResponse create(PromotionRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Producto no encontrado con id " + request.productId()));

        if (Boolean.FALSE.equals(product.getActive())) {
            throw new BadRequestException(
                    "No se puede crear una promoción para un producto inactivo.");
        }

        InventoryBatch batch = findBatchIfPresent(request.batchId());
        if (batch != null) {
            validateBatchForPromotion(product, batch);
        }

        User user = findUserIfPresent(request.createdById());
        validatePromotionRequest(request);

        Promotion promotion = new Promotion();
        promotion.setProduct(product);
        promotion.setBatch(batch);
        promotion.setCreatedBy(user);
        promotion.setTitle(request.title());
        promotion.setDescription(request.description());
        promotion.setDiscountType(request.discountType());
        promotion.setDiscountPercentage(request.discountPercentage());
        promotion.setPromotionalPrice(request.promotionalPrice());
        promotion.setStartDate(request.startDate());
        promotion.setEndDate(request.endDate());
        promotion.setStatus(PromotionStatus.ACTIVE);
        promotion.setSuggestedBySystem(
                request.suggestedBySystem() != null ? request.suggestedBySystem() : false);

        Promotion saved = promotionRepository.save(promotion);
        return PromotionMapper.toResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/promotions  (OWNER + EMPLOYEE)
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public List<PromotionResponse> findAll() {
        return promotionRepository.findAll()
                .stream()
                .map(PromotionMapper::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/promotions/active  (OWNER + EMPLOYEE)
    // Devuelve solo las que están en estado ACTIVE y no han terminado aún.
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public List<PromotionResponse> findActive() {
        return promotionRepository.findActive()
                .stream()
                .map(PromotionMapper::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH /api/promotions/{id}/cancel  (OWNER)
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    public PromotionResponse cancel(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Promoción no encontrada con id " + id));

        if (promotion.getStatus() == PromotionStatus.CANCELLED) {
            throw new BadRequestException("La promoción ya se encuentra cancelada.");
        }

        promotion.setStatus(PromotionStatus.CANCELLED);
        Promotion saved = promotionRepository.save(promotion);
        return PromotionMapper.toResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private PromotionSuggestionResponse toSuggestion(InventoryBatch batch) {
        LocalDate today       = LocalDate.now(ZONE);
        long daysToExpire     = ChronoUnit.DAYS.between(today, batch.getExpirationDate());
        ExpirationStatus status = calculateExpirationStatus(batch.getExpirationDate());

        // Descuento sugerido: 20% si vence hoy o mañana (RED), 10% si faltan más días (YELLOW)
        BigDecimal suggestedDiscount = status == ExpirationStatus.RED
                ? BigDecimal.valueOf(20)
                : BigDecimal.valueOf(10);

        String suggestedTitle = "Promo " + batch.getProduct().getName();

        return new PromotionSuggestionResponse(
                batch.getId(),
                batch.getProduct().getId(),
                batch.getProduct().getName(),
                batch.getCurrentQuantity(),
                batch.getExpirationDate(),
                daysToExpire,
                status,
                suggestedDiscount,
                suggestedTitle
        );
    }

    private ExpirationStatus calculateExpirationStatus(LocalDate expirationDate) {
        if (expirationDate == null) return ExpirationStatus.NOT_APPLICABLE;

        LocalDate today = LocalDate.now(ZONE);
        long days = ChronoUnit.DAYS.between(today, expirationDate);

        if (days < 0)  return ExpirationStatus.EXPIRED;
        if (days == 0) return ExpirationStatus.RED;
        if (days <= getPromotionSuggestionDays()) return ExpirationStatus.YELLOW;
        return ExpirationStatus.GREEN;
    }

    private void validatePromotionRequest(PromotionRequest request) {
        if (request.endDate() == null || request.startDate() == null) {
            throw new BadRequestException("Las fechas de inicio y fin son obligatorias.");
        }
        if (!request.endDate().isAfter(request.startDate())) {
            throw new BadRequestException(
                    "La fecha de fin debe ser posterior a la fecha de inicio.");
        }

        if (request.discountType() == DiscountType.PERCENTAGE) {
            if (request.discountPercentage() == null)
                throw new BadRequestException(
                        "Las promociones por porcentaje deben indicar discountPercentage.");
            if (request.promotionalPrice() != null)
                throw new BadRequestException(
                        "Las promociones por porcentaje no deben indicar promotionalPrice.");
        }

        if (request.discountType() == DiscountType.FIXED_PRICE) {
            if (request.promotionalPrice() == null)
                throw new BadRequestException(
                        "Las promociones por precio fijo deben indicar promotionalPrice.");
            if (request.discountPercentage() != null)
                throw new BadRequestException(
                        "Las promociones por precio fijo no deben indicar discountPercentage.");
        }
    }

    private InventoryBatch findBatchIfPresent(Long batchId) {
        if (batchId == null) return null;
        return inventoryBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lote no encontrado con id " + batchId));
    }

    private User findUserIfPresent(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con id " + userId));
    }

    private void validateBatchForPromotion(Product product, InventoryBatch batch) {
        if (!batch.getProduct().getId().equals(product.getId())) {
            throw new BadRequestException(
                    "El lote indicado no pertenece al producto informado.");
        }

        if (batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException(
                    "No se puede crear una promoción para un lote sin stock disponible.");
        }

        LocalDate today = LocalDate.now(ZONE);
        if (batch.getExpirationDate() != null
                && batch.getExpirationDate().isBefore(today)) {
            throw new BadRequestException(
                    "No se puede crear una promoción para un lote ya vencido.");
        }

        if (promotionRepository.existsActiveByBatchId(batch.getId())) {
            throw new BadRequestException(
                    "El lote ya tiene una promoción activa. Cancelá la existente antes de crear una nueva.");
        }
    }

    private int getPromotionSuggestionDays() {
        return appSettingRepository.findBySettingKey(PROMOTION_SUGGESTION_DAYS_KEY)
                .map(AppSetting::getSettingValue)
                .map(Integer::parseInt)
                .orElse(DEFAULT_PROMOTION_SUGGESTION_DAYS);
    }
}