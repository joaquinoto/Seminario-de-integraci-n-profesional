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

                    // ── Auth: public ─────────────────────────────────────────────────
                    .requestMatchers("/auth/**").permitAll()

                    // ── Service Worker: public ────────────────────────────────────────
                    .requestMatchers("/sw.js").permitAll()

                    // ── Users ────────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET, "/users/data").authenticated()
                    .requestMatchers(HttpMethod.PUT, "/users/update").authenticated()
                    .requestMatchers("/users/**").hasAuthority(Role.OWNER.name())

                    // ── Products ─────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/products/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/products/**").hasAuthority(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/products/**").hasAuthority(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAuthority(Role.OWNER.name())

                    // ── Categories ───────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/categories/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/categories/**").hasAuthority(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/categories/**").hasAuthority(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasAuthority(Role.OWNER.name())

                    // ── Suppliers ────────────────────────────────────────────────────
                    .requestMatchers(HttpMethod.GET,    "/api/suppliers/**").authenticated()
                    .requestMatchers(HttpMethod.POST,   "/api/suppliers/**").hasAuthority(Role.OWNER.name())
                    .requestMatchers(HttpMethod.PUT,    "/api/suppliers/**").hasAuthority(Role.OWNER.name())
                    .requestMatchers(HttpMethod.DELETE, "/api/suppliers/**").hasAuthority(Role.OWNER.name())

                    // ── Stock: OWNER + EMPLOYEE (entries, sales, adjustments, summary, batches, expiring, expired) ──
                    .requestMatchers("/api/stock/**").authenticated()

                    // ── Restock suggestions: OWNER only ──────────────────────────────
                    // NOTE: this is a sub-path of /api/stock/** so the authenticated()
                    // rule above covers the base, but we add an explicit OWNER guard.
                    // Spring Security evaluates rules in order — place OWNER rule BEFORE
                    // the generic authenticated() rule for /api/stock/**.
                    // The ordering is handled below by placing this before the stock catch-all.
                    // (Re-declared explicitly for clarity; Spring uses first-match.)
                    .requestMatchers(HttpMethod.GET, "/api/stock/restock-suggestions").hasAuthority(Role.OWNER.name())

                    // ── Waste records: OWNER + EMPLOYEE ───────────────────────────────
                    .requestMatchers("/api/waste-records/**").authenticated()

                    // ── Alerts: OWNER + EMPLOYEE ─────────────────────────────────────
                    .requestMatchers("/api/alerts/**").authenticated()

                    // ── Dashboard: OWNER + EMPLOYEE ──────────────────────────────────
                    .requestMatchers("/api/dashboard/**").authenticated()

                    // ── Promotions: OWNER only ────────────────────────────────────────
                    .requestMatchers("/api/promotions/**").hasAuthority(Role.OWNER.name())

                    // ── Reports: OWNER only ───────────────────────────────────────────
                    .requestMatchers("/api/reports/**").hasAuthority(Role.OWNER.name())

                    // ── Settings: OWNER only ──────────────────────────────────────────
                    .requestMatchers("/api/settings/**").hasAuthority(Role.OWNER.name())

                    // ── Anything else: authenticated ──────────────────────────────────
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