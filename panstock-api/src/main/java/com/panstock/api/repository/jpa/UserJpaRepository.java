package com.panstock.api.repository.jpa;

import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserJpaRepository extends JpaRepository<User, Long> {

    List<User> findAllByOrderByLastNameAscFirstNameAsc();

    List<User> findByEnabledTrueOrderByLastNameAscFirstNameAsc();

    List<User> findByEnabledTrueAndRoleOrderByLastNameAscFirstNameAsc(Role role);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
}