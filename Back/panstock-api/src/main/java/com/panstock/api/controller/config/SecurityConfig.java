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
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(req -> req

                    // ── Preflight ────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                    // ── Auth: public ─────────────────────────────────────────────────
                    .requestMatchers("/auth/**").permitAll()

                    // ── Service Worker: public ────────────────────────────────────────
                    .requestMatchers("/sw.js").permitAll()

                    // ── Users ─────────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET, "/users/data").authenticated()
                    .requestMatchers(HttpMethod.PUT, "/users/update").authenticated()
                    .requestMatchers("/users/**").hasRole(Role.OWNER.name())

                    // ── Products ──────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/products/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/products/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/products/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasRole(Role.OWNER.name())

                    // ── Categories ────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/categories/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/categories/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/categories/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasRole(Role.OWNER.name())

                    // ── Suppliers ─────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/suppliers/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/suppliers/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/suppliers/**").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/suppliers/**").hasRole(Role.OWNER.name())

                    // ── Stock: OWNER + EMPLOYEE ───────────────────────────────────────
                    .requestMatchers("/api/stock/**").authenticated()

                    // ── Restock suggestions: OWNER only ───────────────────────────────
                    .requestMatchers(HttpMethod.GET, "/api/stock/restock-suggestions").hasRole(Role.OWNER.name())

                    // ── Waste records: OWNER + EMPLOYEE ───────────────────────────────
                    .requestMatchers(HttpMethod.GET,  "/api/waste-records").authenticated()
                    .requestMatchers(HttpMethod.GET,  "/api/waste-records/**").authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/waste-records").authenticated()

                    // ── Alerts: OWNER + EMPLOYEE ──────────────────────────────────────
                    .requestMatchers("/api/alerts/**").authenticated()

                    // ── Dashboard: OWNER + EMPLOYEE ───────────────────────────────────
                    .requestMatchers("/api/dashboard/**").authenticated()

                    // ── Promotions ────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET, "/api/promotions/suggestions").hasRole(Role.OWNER.name())
                    .requestMatchers(HttpMethod.GET, "/api/promotions").authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/promotions/active").authenticated()

                    // ── Reports: OWNER only ───────────────────────────────────────────
                    .requestMatchers("/api/reports/**").hasRole(Role.OWNER.name())

                    // ── Settings: OWNER only ───────────────────────────────────────────
                    .requestMatchers("/api/settings/**").hasRole(Role.OWNER.name())

                    .requestMatchers("/actuator/**").permitAll()

                    // ── Anything else: authenticated ───────────────────────────────────
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
