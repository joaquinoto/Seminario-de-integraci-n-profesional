package com.panstock.api.controller.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.panstock.api.enums.Role;

import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;

    @Autowired
    @Lazy
    private AuthenticationProvider authenticationProvider;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(req -> req

                    // Auth: público
                    .requestMatchers("/auth/**").permitAll()

                    // Users: autenticado para ver datos propios,
                    // solo OWNER para listar y deshabilitar
                    .requestMatchers(HttpMethod.GET, "/users/data").authenticated()
                    .requestMatchers(HttpMethod.PUT, "/users/update").authenticated()
                    .requestMatchers("/users/**").hasAuthority(Role.OWNER.name())

                    // Productos: GET público, escritura solo OWNER
                    .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                    .requestMatchers("/api/products/**").hasAuthority(Role.OWNER.name())

                    // Categorías: GET público, escritura solo OWNER
                    .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                    .requestMatchers("/api/categories/**").hasAuthority(Role.OWNER.name())

                    // Proveedores: GET autenticado, escritura solo OWNER
                    .requestMatchers(HttpMethod.GET, "/api/suppliers/**").authenticated()
                    .requestMatchers("/api/suppliers/**").hasAuthority(Role.OWNER.name())

                    // Stock: operaciones disponibles para OWNER y EMPLOYEE
                    .requestMatchers("/api/stock/**").authenticated()

                    // Mermas: OWNER y EMPLOYEE
                    .requestMatchers("/api/waste-records/**").authenticated()

                    // Alertas: OWNER y EMPLOYEE
                    .requestMatchers("/api/alerts/**").authenticated()

                    // Promociones: solo OWNER
                    .requestMatchers("/api/promotions/**").hasAuthority(Role.OWNER.name())

                    // Reportes: solo OWNER
                    .requestMatchers("/api/reports/**").hasAuthority(Role.OWNER.name())

                    // Settings: solo OWNER
                    .requestMatchers("/api/settings/**").hasAuthority(Role.OWNER.name())

                    // Dashboard: OWNER y EMPLOYEE
                    .requestMatchers("/api/dashboard/**").authenticated()

                    // Cualquier otra cosa: autenticado
                    .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        corsConfig.setAllowedOrigins(List.of("*"));
        corsConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        corsConfig.setAllowCredentials(false);
        corsConfig.addAllowedHeader("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);
        return source;
    }
}