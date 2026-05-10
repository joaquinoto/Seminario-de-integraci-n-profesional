package com.panstock.api.service;

import com.panstock.api.dto.request.PromotionRequest;
import com.panstock.api.dto.response.PromotionResponse;
import com.panstock.api.dto.response.PromotionSuggestionResponse;

import java.util.List;

public interface PromotionService {

    List<PromotionSuggestionResponse> getSuggestions();

    PromotionResponse create(PromotionRequest request);

    List<PromotionResponse> findAll();

    List<PromotionResponse> findActive();

    PromotionResponse cancel(Long id);
}