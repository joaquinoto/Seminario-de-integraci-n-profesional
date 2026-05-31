package com.panstock.api.service.impl;

import com.panstock.api.dto.request.UpdateIntegerSettingRequest;
import com.panstock.api.dto.response.SettingResponse;
import com.panstock.api.entity.AppSetting;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.repository.AppSettingRepository;
import com.panstock.api.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SettingsServiceImpl implements SettingsService {

    private static final String EXPIRATION_ALERT_DAYS_KEY = "expiration_alert_days";
    private static final String PROMOTION_SUGGESTION_DAYS_KEY = "promotion_suggestion_days";

    private final AppSettingRepository appSettingRepository;

    @Override
    @Transactional(readOnly = true)
    public SettingResponse getExpirationAlertDays() {
        AppSetting setting = findSetting(EXPIRATION_ALERT_DAYS_KEY);
        return toResponse(setting);
    }

    @Override
    public SettingResponse updateExpirationAlertDays(UpdateIntegerSettingRequest request) {
        validatePositiveDays(request.value());

        AppSetting setting = findSetting(EXPIRATION_ALERT_DAYS_KEY);
        setting.setSettingValue(request.value().toString());

        AppSetting saved = appSettingRepository.save(setting);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SettingResponse getPromotionSuggestionDays() {
        AppSetting setting = findSetting(PROMOTION_SUGGESTION_DAYS_KEY);
        return toResponse(setting);
    }

    @Override
    public SettingResponse updatePromotionSuggestionDays(UpdateIntegerSettingRequest request) {
        validatePositiveDays(request.value());

        AppSetting setting = findSetting(PROMOTION_SUGGESTION_DAYS_KEY);
        setting.setSettingValue(request.value().toString());

        AppSetting saved = appSettingRepository.save(setting);
        return toResponse(saved);
    }

    private AppSetting findSetting(String key) {
        return appSettingRepository.findBySettingKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("Configuración no encontrada: " + key));
    }

    private void validatePositiveDays(Integer value) {
        if (value == null || value <= 0) {
            throw new BadRequestException("La cantidad de días debe ser mayor a cero.");
        }

        if (value > 30) {
            throw new BadRequestException("La cantidad de días no puede superar 30.");
        }
    }

    private SettingResponse toResponse(AppSetting setting) {
        return new SettingResponse(
                setting.getSettingKey(),
                setting.getSettingValue(),
                setting.getDescription()
        );
    }
}