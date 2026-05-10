package com.panstock.api.dto.request;

import com.panstock.api.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserRequest(

        @NotBlank(message = "El nombre es obligatorio.")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres.")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio.")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres.")
        String lastName,

        @NotBlank(message = "El email es obligatorio.")
        @Email(message = "El email no tiene un formato válido.")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres.")
        String email,

        @Size(max = 255, message = "La contraseña no puede superar los 255 caracteres.")
        String password,

        @NotNull(message = "El rol es obligatorio.")
        Role role,

        Boolean enabled
) {
}