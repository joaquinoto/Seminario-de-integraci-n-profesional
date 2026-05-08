package com.panstock.api.repository;

import com.panstock.api.entity.User;

import java.util.Optional;

public interface UserRepository {

    Optional<User> findById(Long id);
}