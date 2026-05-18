package com.panstock.api.service;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import com.panstock.api.controller.auth.AuthenticationRequest;
import com.panstock.api.controller.auth.AuthenticationResponse;
import com.panstock.api.controller.auth.RegisterRequest;
import com.panstock.api.controller.config.JwtService;
import com.panstock.api.entity.User;
import com.panstock.api.exception.UserException;
import com.panstock.api.repository.jpa.UserJpaRepository;

import jakarta.security.auth.message.AuthException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    // Solo @RequiredArgsConstructor, sin @Autowired adicionales sobre campos final
    private final UserJpaRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserService userService;

    public AuthenticationResponse register(RegisterRequest request) throws Exception {
        try {
            User user = userService.createUser(request);
            String jwtToken = jwtService.generateToken(user);
            return AuthenticationResponse.builder()
                    .accessToken(jwtToken)
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .build();
        } catch (UserException error) {
            throw new UserException(error.getMessage());
        } catch (Exception error) {
            throw new Exception("[AuthenticationService.register] -> " + error.getMessage());
        }
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) throws Exception {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()));

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new UserException("El usuario " + request.getUsername() + " no existe."));

            String jwtToken = jwtService.generateToken(user);
            return AuthenticationResponse.builder()
                    .accessToken(jwtToken)
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .build();
        } catch (AuthenticationException error) {
            System.out.printf("[AuthenticationService.authenticate] -> %s", error.getMessage());
            throw new AuthException("Usuario o contraseña incorrecto.");
        } catch (UserException error) {
            throw new UserException(error.getMessage());
        } catch (Exception error) {
            throw new Exception("[AuthenticationService.authenticate] -> " + error.getMessage());
        }
    }
}