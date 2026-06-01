package com.panstock.api.controller;

import com.panstock.api.dto.response.RestockSuggestionResponse;
import com.panstock.api.service.RestockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RestockController
 *
 * Endpoint: GET /api/stock/restock-suggestions
 *
 * Solo accesible por el rol OWNER (configurado en SecurityConfig).
 * Devuelve productos con stock por debajo del mínimo configurado,
 * enriquecidos con datos del último lote y el horario de pedido del proveedor.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stock")
public class RestockController {

    private final RestockService restockService;

    @GetMapping("/restock-suggestions")
    public List<RestockSuggestionResponse> getRestockSuggestions() {
        return restockService.getSuggestions();
    }
}