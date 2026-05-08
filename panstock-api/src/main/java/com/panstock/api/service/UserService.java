package com.panstock.api.service;

import com.panstock.api.dto.request.UserRequest;
import com.panstock.api.dto.response.UserResponse;
import com.panstock.api.enums.Role;

import java.util.List;

public interface UserService {

    UserResponse create(UserRequest request);

    List<UserResponse> findAll(Boolean enabledOnly, Role role);

    UserResponse findById(Long id);

    UserResponse update(Long id, UserRequest request);

    void delete(Long id);
}