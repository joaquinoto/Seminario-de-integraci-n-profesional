package com.panstock.api.mapper;

import com.panstock.api.dto.response.UserResponse;
import com.panstock.api.entity.User;

public class UserMapper {

    private UserMapper() {
    }

    public static UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }

        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRole(),
                user.getEnabled()
        );
    }
}