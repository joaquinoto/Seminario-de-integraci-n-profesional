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
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.panstock.api.enums.Role;

import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

import java.util.Arrays;
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
        http
            // CRÍTICO: usar el bean corsConfigurationSource, no lambda inline
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(req -> req

                    // ── Preflight OPTIONS: siempre permitir PRIMERO ──────────
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                    // ── Auth: public ─────────────────────────────────────────
                    .requestMatchers("/auth/**").permitAll()

                    // ── Service Worker ───────────────────────────────────────
                    .requestMatchers("/sw.js").permitAll()

                    // ── Actuator ─────────────────────────────────────────────
                    .requestMatchers("/actuator/**").permitAll()

                    // ── Users ─────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET, "/users/data").authenticated()
                    .requestMatchers(HttpMethod.PUT, "/users/update").authenticated()
                    .requestMatchers("/users/**").hasRole(Role.OWNER.name())

                    // ── Products ──────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/products/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/products/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/products/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasRole(Role.OWNER.name())

                    // ── Categories ────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/categories/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/categories/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/categories/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasRole(Role.OWNER.name())

                    // ── Suppliers ─────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/suppliers/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/suppliers/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/suppliers/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/suppliers/**").hasRole(Role.OWNER.name())

                    // ── Stock ─────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET, "/api/stock/restock-suggestions").hasRole(Role.OWNER.name())
                    .requestMatchers("/api/stock/**").authenticated()

                    // ── Waste records ─────────────────────────────────────────
                    .requestMatchers("/api/waste-records/**").authenticated()
                    .requestMatchers("/api/waste-records").authenticated()

                    // ── Alerts ────────────────────────────────────────────────
                    .requestMatchers("/api/alerts/**").authenticated()

                    // ── Dashboard ─────────────────────────────────────────────
                    .requestMatchers("/api/dashboard/**").authenticated()

                    // ── Promotions ────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET, "/api/promotions/suggestions").hasRole(Role.OWNER.name())
                    .requestMatchers("/api/promotions/**").authenticated()
                    .requestMatchers("/api/promotions").authenticated()

                    // ── Reports ───────────────────────────────────────────────
                    .requestMatchers("/api/reports/**").hasRole(Role.OWNER.name())

                    // ── Settings ──────────────────────────────────────────────
                    .requestMatchers("/api/settings/**").hasRole(Role.OWNER.name())

                    // ── Default ───────────────────────────────────────────────
                    .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Orígenes explícitos — NUNCA usar "*" en producción con JWT
        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",
            "http://localhost:3000",
            "https://seminario-de-integraci-n-profesiona.vercel.app",
            "https://*.vercel.app"
        ));

        // Métodos explícitos
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"
        ));

        // Headers que el frontend envía — incluir Authorization explícitamente
        config.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "authorization",        // minúsculas para proxies
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        // Headers que el navegador puede leer en la respuesta
        config.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type"
        ));

        // Con orígenes explícitos SÍ podemos usar credentials si lo necesitáramos
        // Por ahora false está bien ya que usamos Bearer token
        config.setAllowCredentials(false);

        // Cache del preflight: 1 hora
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}