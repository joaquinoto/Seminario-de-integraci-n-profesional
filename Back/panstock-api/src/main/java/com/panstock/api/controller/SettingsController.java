package com.panstock.api.controller;

import com.panstock.api.dto.request.UpdateIntegerSettingRequest;
import com.panstock.api.dto.response.SettingResponse;
import com.panstock.api.service.SettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping("/expiration-alert-days")
    public SettingResponse getExpirationAlertDays() {
        return settingsService.getExpirationAlertDays();
    }

    @PutMapping("/expiration-alert-days")
    public SettingResponse updateExpirationAlertDays(
            @Valid @RequestBody UpdateIntegerSettingRequest request
    ) {
        return settingsService.updateExpirationAlertDays(request);
    }

    @GetMapping("/promotion-suggestion-days")
    public SettingResponse getPromotionSuggestionDays() {
        return settingsService.getPromotionSuggestionDays();
    }

    @PutMapping("/promotion-suggestion-days")
    public SettingResponse updatePromotionSuggestionDays(
            @Valid @RequestBody UpdateIntegerSettingRequest request
    ) {
        return settingsService.updatePromotionSuggestionDays(request);
    }
}