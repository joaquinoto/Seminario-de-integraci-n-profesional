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

    @GetMapping("/suggestions")
    public List<PromotionSuggestionResponse> getSuggestions() {
        return promotionService.getSuggestions();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PromotionResponse create(@Valid @RequestBody PromotionRequest request) {
        return promotionService.create(request);
    }

    @GetMapping
    public List<PromotionResponse> findAll() {
        return promotionService.findAll();
    }

    @GetMapping("/active")
    public List<PromotionResponse> findActive() {
        return promotionService.findActive();
    }

    @PatchMapping("/{id}/cancel")
    public PromotionResponse cancel(@PathVariable Long id) {
        return promotionService.cancel(id);
    }
}