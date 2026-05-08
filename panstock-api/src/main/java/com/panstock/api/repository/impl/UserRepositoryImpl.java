package com.panstock.api.repository.impl;

import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;
import com.panstock.api.repository.UserRepository;
import com.panstock.api.repository.jpa.UserJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepository {

    private final UserJpaRepository userJpaRepository;

    @Override
    public User save(User user) {
        return userJpaRepository.save(user);
    }

    @Override
    public Optional<User> findById(Long id) {
        return userJpaRepository.findById(id);
    }

    @Override
    public List<User> findAll() {
        return userJpaRepository.findAllByOrderByLastNameAscFirstNameAsc();
    }

    @Override
    public List<User> findEnabled() {
        return userJpaRepository.findByEnabledTrueOrderByLastNameAscFirstNameAsc();
    }

    @Override
    public List<User> findEnabledByRole(Role role) {
        return userJpaRepository.findByEnabledTrueAndRoleOrderByLastNameAscFirstNameAsc(role);
    }

    @Override
    public boolean existsByEmailIgnoreCase(String email) {
        return userJpaRepository.existsByEmailIgnoreCase(email);
    }

    @Override
    public boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id) {
        return userJpaRepository.existsByEmailIgnoreCaseAndIdNot(email, id);
    }
}