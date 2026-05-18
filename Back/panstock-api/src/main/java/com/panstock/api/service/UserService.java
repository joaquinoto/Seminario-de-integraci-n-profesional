package com.panstock.api.service;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.panstock.api.controller.auth.RegisterRequest;
import com.panstock.api.entity.User;

import jakarta.transaction.Transactional;

public interface UserService {

    @Transactional
    public User createUser(RegisterRequest request) throws Exception;

    public User getUserByUsername(String username) throws Exception;

    public Page<User> getUsers(PageRequest pageRequest) throws Exception;

    public User updateUser(User user) throws Exception;

    public Optional<User> getUserById(Long userId)throws Exception;
}