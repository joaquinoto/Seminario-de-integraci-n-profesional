package com.panstock.api.controller.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    @Lazy
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        // Pasar preflight OPTIONS sin procesar
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Buscar el header Authorization en múltiples formatos
        // (algunos proxies lo normalizan a minúsculas)
        String authHeader = extractAuthHeader(request);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            final String jwt = authHeader.substring(7).trim();
            
            if (jwt.isEmpty()) {
                filterChain.doFilter(request, response);
                return;
            }

            final String username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                
                if (jwtService.isTokenValid(jwt, userDetails) && !jwtService.isTokenExpired(jwt)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception error) {
            // Limpiar contexto pero NO enviar 401 aquí — dejar que Spring Security lo maneje
            // Esto permite que rutas públicas sigan funcionando aunque el token sea inválido
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extrae el header Authorization probando múltiples variantes.
     * En producción con proxies (Render, Nginx, Cloudflare) el header
     * puede llegar en minúsculas o con variaciones.
     */
    private String extractAuthHeader(HttpServletRequest request) {
        // Variantes del header que diferentes proxies pueden enviar
        String[] headerVariants = {
            "Authorization",
            "authorization",
            "AUTHORIZATION"
        };

        for (String headerName : headerVariants) {
            String value = request.getHeader(headerName);
            if (value != null && !value.isEmpty()) {
                return value;
            }
        }
        return null;
    }
}