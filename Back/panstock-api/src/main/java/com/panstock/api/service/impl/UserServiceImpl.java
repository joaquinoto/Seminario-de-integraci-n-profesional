package com.panstock.api.service.impl;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.panstock.api.controller.auth.RegisterRequest;
import com.panstock.api.dto.UserDTO;
import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;
import com.panstock.api.exception.UserException;
import com.panstock.api.repository.jpa.UserJpaRepository;
import com.panstock.api.service.UserService;

import jakarta.transaction.Transactional;

@Service
public class UserServiceImpl implements UserService{

    @Autowired
    private UserJpaRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

	  @Transactional
    public User createUser(RegisterRequest request) throws Exception {
			try {
				boolean userExist = userRepository.existsByUsername(request.getUsername());
          if(userExist) throw new UserException("El usuario " + request.getUsername() + " ya existe");
            userExist = userRepository.existsByEmail(request.getEmail());
          if(userExist) throw new UserException("El email " + request.getEmail() + " ya esta registrado.");

        
				User user = new User(null,request.getUsername(), request.getFirstName(), request.getLastName(),
								request.getEmail(),
								passwordEncoder.encode(request.getPassword()),
                request.getRole(), true); // siempre habilitado al crear
        
        return userRepository.save(user);
        
				
			} catch (UserException error) {
                throw new UserException(error.getMessage());
            } catch (Exception error) {
				throw new Exception("[UserService.createUser] -> " + error.getMessage());
			}
    }

    public User getUserByUsername(String username) throws Exception {
        try {
          return userRepository.findByUsername(username).orElseThrow(() -> new UserException("Usuario no encontrado"));
        } catch (UserException error) {
          throw new UserException(error.getMessage());
        } catch (Exception error) {
          throw new Exception("[UserService.getUserByUsername] -> " + error.getMessage());
        }
    }

    public Page<User> getUsers(PageRequest pageable) throws Exception {
        try {
          return userRepository.findAll(pageable);
        } catch (Exception error) {
          throw new Exception("[UserService.getAllUsers] -> " + error.getMessage());
        }
    }

    public Optional<User> getUserById(Long userId)throws Exception {
        try{
        return userRepository.findById(userId);
        }  catch (Exception error) {
            throw new Exception("[UserService.updateUser] -> " + error.getMessage());
          }
    }
    
    @Transactional
    @Override
    public User updateUser(User authenticatedUser, UserDTO updates) throws Exception {
        try {
            // Si el email cambió, verificar que no esté en uso por otro usuario
            String newEmail = updates.getEmail();
            if (newEmail != null && !newEmail.equalsIgnoreCase(authenticatedUser.getEmail())) {
                boolean emailTaken = userRepository.existsByEmailIgnoreCaseAndIdNot(
                        newEmail, authenticatedUser.getId()
                );
                if (emailTaken)
                    throw new UserException("El email " + newEmail + " ya está en uso por otro usuario.");
                authenticatedUser.setEmail(newEmail);
            }

            // Actualizar campos básicos si vienen informados
            if (updates.getFirstName() != null && !updates.getFirstName().isBlank())
                authenticatedUser.setFirstName(updates.getFirstName());

            if (updates.getLastName() != null && !updates.getLastName().isBlank())
                authenticatedUser.setLastName(updates.getLastName());

            // Actualizar contraseña solo si viene un valor real (no null, no vacío)
            String newPassword = updates.getPassword();
            if (newPassword != null && !newPassword.isBlank()) {
                authenticatedUser.setPassword(passwordEncoder.encode(newPassword));
            }

            // role y enabled NO se tocan aquí bajo ninguna circunstancia

            return userRepository.save(authenticatedUser);

        } catch (UserException error) {
            throw new UserException(error.getMessage());
        } catch (Exception error) {
            throw new Exception("[UserService.updateUser] -> " + error.getMessage());
        }
    }
 // -------------------------------------------------------
    // DESHABILITAR EMPLEADO
    //
    // Reglas:
    //   1. Solo un OWNER puede llamar a esta acción.
    //   2. El usuario objetivo debe tener rol EMPLOYEE.
    //   3. No se puede deshabilitar a un OWNER (incluido a sí mismo).
    //   4. No se puede deshabilitar a alguien ya deshabilitado.
    // -------------------------------------------------------

    @Transactional
    @Override
    public void disableEmployee(User requestingUser, Long targetUserId) throws Exception {
        try {
            // Regla 1: solo OWNER puede hacer esta acción
            if (requestingUser.getRole() != Role.OWNER) {
                throw new UserException("Solo un OWNER puede deshabilitar usuarios.");
            }

            // Buscar el usuario objetivo
            User target = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new UserException("Usuario no encontrado con id " + targetUserId));

            // Regla 2 y 3: el objetivo debe ser EMPLOYEE, no OWNER
            if (target.getRole() == Role.OWNER) {
                throw new UserException("No se puede deshabilitar a un OWNER.");
            }

            // Regla 4: ya está deshabilitado
            if (!target.isEnabled()) {
                throw new UserException("El usuario ya está deshabilitado.");
            }

            target.setEnabled(false);
            userRepository.save(target);

        } catch (UserException error) {
            throw new UserException(error.getMessage());
        } catch (Exception error) {
            throw new Exception("[UserService.disableEmployee] -> " + error.getMessage());
        }
    }
}
