package com.panstock.api.repository.jpa;

import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<User, Long> {

    List<User> findAllByOrderByLastNameAscFirstNameAsc();

    List<User> findByEnabledTrueOrderByLastNameAscFirstNameAsc();

    List<User> findByEnabledTrueAndRoleOrderByLastNameAscFirstNameAsc(Role role);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Query("SELECT u FROM User u WHERE u.username = ?1")
    Optional<User> findByUsername(String username);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
}