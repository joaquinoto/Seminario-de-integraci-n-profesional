package com.panstock.api.repository.jpa;

import com.panstock.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserJpaRepository extends JpaRepository<User, Long> {
}