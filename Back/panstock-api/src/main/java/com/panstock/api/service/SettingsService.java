package com.panstock.api.service;

import com.panstock.api.dto.request.UpdateIntegerSettingRequest;
import com.panstock.api.dto.response.SettingResponse;

public interface SettingsService {

    SettingResponse getExpirationAlertDays();

    SettingResponse updateExpirationAlertDays(UpdateIntegerSettingRequest request);

    SettingResponse getPromotionSuggestionDays();

    SettingResponse updatePromotionSuggestionDays(UpdateIntegerSettingRequest request);
}