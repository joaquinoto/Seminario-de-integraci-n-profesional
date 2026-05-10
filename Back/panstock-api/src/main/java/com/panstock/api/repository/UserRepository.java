package com.panstock.api.repository;

import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;

import java.util.List;
import java.util.Optional;

public interface UserRepository {

    User save(User user);

    Optional<User> findById(Long id);

    List<User> findAll();

    List<User> findEnabled();

    List<User> findEnabledByRole(Role role);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
}