package com.panstock.api.dto.response;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        Boolean active
) {
}