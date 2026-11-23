package com.servix.app.data.model

/** Cuerpo de POST /auth/register */
data class RegistroRequest(
    val nombreCompleto: String,
    val correoElectronico: String,
    val telefono: String,
    val contrasena: String
)

/** Cuerpo de POST /auth/login */
data class LoginRequest(
    val correoElectronico: String,
    val contrasena: String
)

data class UsuarioDto(
    val id: String,
    val nombreCompleto: String,
    val correoElectronico: String,
    val telefono: String?,
    val disponible: Boolean
)

/** Respuesta de registro e inicio de sesión: el usuario y su token de 8 horas. */
data class SesionDto(
    val usuario: UsuarioDto,
    val token: String
)