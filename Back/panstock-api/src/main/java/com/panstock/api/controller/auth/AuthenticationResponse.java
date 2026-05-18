package com.panstock.api.controller.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.panstock.api.enums.Role;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponse {
    @NotNull
    @JsonProperty("access_token")
    private String accessToken;

    @NotNull
    private String username;

    @NotNull
    private String email;

    @NotNull
    private Role role;

    private String firstName;

    private String lastName;
}
