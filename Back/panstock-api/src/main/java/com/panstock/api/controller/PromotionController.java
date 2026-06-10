package com.panstock.api.controller;

import com.panstock.api.dto.request.PromotionRequest;
import com.panstock.api.dto.response.PromotionResponse;
import com.panstock.api.dto.response.PromotionSuggestionResponse;
import com.panstock.api.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/promotions")
public class PromotionController {

    private final PromotionService promotionService;

    /**
     * GET /api/promotions/suggestions
     * Sugerencias de promoción basadas en lotes próximos a vencer.
     * Solo OWNER (configurado en SecurityConfig).
     */
    @GetMapping("/suggestions")
    public List<PromotionSuggestionResponse> getSuggestions() {
        return promotionService.getSuggestions();
    }

    /**
     * POST /api/promotions
     * Crear una nueva promoción a partir de una sugerencia o manualmente.
     * Solo OWNER.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PromotionResponse create(@Valid @RequestBody PromotionRequest request) {
        return promotionService.create(request);
    }

    /**
     * GET /api/promotions
     * Listar todas las promociones (OWNER + EMPLOYEE).
     * Accesible por ambos roles para que los empleados vean las promociones vigentes.
     */
    @GetMapping
    public List<PromotionResponse> findAll() {
        return promotionService.findAll();
    }

    /**
     * GET /api/promotions/active
     * Listar solo promociones activas y vigentes (OWNER + EMPLOYEE).
     */
    @GetMapping("/active")
    public List<PromotionResponse> findActive() {
        return promotionService.findActive();
    }

    /**
     * PATCH /api/promotions/{id}/cancel
     * Cancelar una promoción activa. Solo OWNER.
     */
    @PatchMapping("/{id}/cancel")
    public PromotionResponse cancel(@PathVariable Long id) {
        return promotionService.cancel(id);
    }
}