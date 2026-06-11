package com.panstock.api.controller.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
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

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
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

                    // ── Preflight OPTIONS: siempre libre — CRÍTICO para CORS ──────────
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

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
                    .requestMatchers(HttpMethod.GET, "/api/stock/restock-suggestions").hasAuthority(Role.OWNER.name())

                    // ── Waste records: OWNER + EMPLOYEE ───────────────────────────────
                    .requestMatchers("/api/waste-records/**").authenticated()

                    // ── Alerts: OWNER + EMPLOYEE ─────────────────────────────────────
                    .requestMatchers("/api/alerts/**").authenticated()

                    // ── Dashboard: OWNER + EMPLOYEE ──────────────────────────────────
                    .requestMatchers("/api/dashboard/**").authenticated()

                    // ── Promotions ────────────────────────────────────────────────────
                    // GET /api/promotions y GET /api/promotions/active → OWNER + EMPLOYEE
                    // (los empleados necesitan ver las promociones activas)
                    .requestMatchers(HttpMethod.GET, "/api/promotions/suggestions").hasAuthority(Role.OWNER.name())
                    .requestMatchers(HttpMethod.GET, "/api/promotions").authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/promotions/active").authenticated()

                    // ── Reports: OWNER only ───────────────────────────────────────────
                    .requestMatchers("/api/reports/**").hasAuthority(Role.OWNER.name())

                    // ── Settings: OWNER only ──────────────────────────────────────────
                    .requestMatchers("/api/settings/**").hasAuthority(Role.OWNER.name())

                    .requestMatchers("/actuator/**").permitAll()

                    // ── Anything else: authenticated ──────────────────────────────────
                    .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ─── CORS Configuration ───────────────────────────────────────────────────
    //
    // FIX: reemplaza allowedOrigins("*") + allowCredentials(false) + addAllowedHeader("*")
    // por allowedOriginPatterns con dominio explícito + allowCredentials(true)
    // + headers declarados explícitamente.
    //
    // Causa raíz del 403 en producción:
    //   - allowedOrigins("*") es incompatible con el envío del header Authorization
    //   - allowCredentials(false) rechazaba explícitamente el flujo de autenticación
    //   - addAllowedHeader("*") no garantizaba que "Authorization" fuera aceptado
    //     en el preflight OPTIONS, por lo que el browser bloqueaba el GET real.

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfig = new CorsConfiguration();

        // allowedOriginPatterns: compatible con allowCredentials(true)
        // Cubre producción Vercel + cualquier Preview URL generada por la rama
        corsConfig.setAllowedOriginPatterns(List.of(
            "https://*.vercel.app",  // Producción + Preview deployments de Vercel
            "http://localhost:5173", // Dev local — Vite default port
            "http://localhost:3000"  // Dev local — puerto alternativo
        ));

        corsConfig.setAllowedMethods(List.of(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));

        // Headers explícitos — el browser necesita ver "Authorization"
        // en Access-Control-Allow-Headers para permitir el request real
        corsConfig.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With"
        ));

        // true: habilita el flujo de credentials (JWT via Authorization header)
        corsConfig.setAllowCredentials(true);

        // Cache del preflight en el browser: 1 hora (evita OPTIONS repetidos)
        corsConfig.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);
        return source;
    }
}
