package com.panstock.api.dto.response;

public record SettingResponse(
        String key,
        String value,
        String description
) {
}