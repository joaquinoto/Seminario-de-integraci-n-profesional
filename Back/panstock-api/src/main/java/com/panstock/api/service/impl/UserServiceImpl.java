package com.panstock.api.service.impl;

import com.panstock.api.dto.request.UserRequest;
import com.panstock.api.dto.response.UserResponse;
import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.UserMapper;
import com.panstock.api.repository.UserRepository;
import com.panstock.api.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public UserResponse create(UserRequest request) {
        validateEmailForCreate(request.email());

        if (request.password() == null || request.password().isBlank()) {
            throw new BadRequestException("La contraseña es obligatoria al crear un usuario.");
        }

        User user = new User();
        applyRequest(user, request, true);

        User saved = userRepository.save(user);
        return UserMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> findAll(Boolean enabledOnly, Role role) {
        List<User> users;

        if (role != null) {
            users = userRepository.findEnabledByRole(role);
        } else if (Boolean.TRUE.equals(enabledOnly)) {
            users = userRepository.findEnabled();
        } else {
            users = userRepository.findAll();
        }

        return users.stream()
                .map(UserMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        User user = findUser(id);
        return UserMapper.toResponse(user);
    }

    @Override
    public UserResponse update(Long id, UserRequest request) {
        User user = findUser(id);

        validateEmailForUpdate(request.email(), id);

        applyRequest(user, request, false);

        User saved = userRepository.save(user);
        return UserMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        User user = findUser(id);

        user.setEnabled(false);

        userRepository.save(user);
    }

    private void applyRequest(User user, UserRequest request, boolean isCreate) {
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setRole(request.role());
        user.setEnabled(request.enabled() != null ? request.enabled() : true);

        if (isCreate || (request.password() != null && !request.password().isBlank())) {
            user.setPassword(request.password());
        }
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id " + id));
    }

    private void validateEmailForCreate(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("Ya existe un usuario con el email " + email);
        }
    }

    private void validateEmailForUpdate(String email, Long id) {
        if (userRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new BadRequestException("Ya existe otro usuario con el email " + email);
        }
    }
}