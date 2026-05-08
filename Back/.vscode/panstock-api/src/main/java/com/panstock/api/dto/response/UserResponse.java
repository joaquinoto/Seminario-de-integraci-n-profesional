package com.panstock.api.dto.response;

import com.panstock.api.enums.Role;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        Role role,
        Boolean enabled
) {
}