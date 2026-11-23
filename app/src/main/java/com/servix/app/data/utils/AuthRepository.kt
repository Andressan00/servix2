package com.servix.app.utils

import com.servix.app.data.model.LoginRequest
import com.servix.app.data.model.RegistroRequest
import com.servix.app.data.model.mensajeDeError
import com.servix.app.data.remote.RetrofitClient
import com.servix.app.data.remote.SesionActual
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.IOException

// Las pantallas llaman a estas funciones con callbacks; las respuestas llegan en el hilo principal.
private val alcance = CoroutineScope(SupervisorJob() + Dispatchers.Main)

private const val SIN_CONEXION = "No se pudo conectar con el servidor. ¿Está encendido el backend?"

fun registrarUsuario(
    email: String,
    pass: String,
    nombre: String,
    telefono: String,
    rol: String,
    onSuccess: (String, String) -> Unit,
    onError: (String) -> Unit
) {
    alcance.launch {
        try {
            val respuesta = RetrofitClient.apiService.registrar(
                RegistroRequest(
                    nombreCompleto = nombre.trim(),
                    correoElectronico = email.trim().lowercase(),
                    telefono = telefono.trim(),
                    contrasena = pass
                )
            )
            val sesion = respuesta.body()?.data
            if (respuesta.isSuccessful && sesion != null) {
                SesionActual.token = sesion.token
                onSuccess(rol, sesion.usuario.nombreCompleto)
            } else {
                onError(mensajeDeError(respuesta.errorBody()?.string(), "No se pudo crear la cuenta", respuesta.code()))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: IOException) {
            onError(SIN_CONEXION)
        } catch (e: Exception) {
            onError("Error inesperado: ${e.message}")
        }
    }
}

fun iniciarSesion(
    email: String,
    pass: String,
    rolSeleccionado: String,
    onSuccess: (String, String) -> Unit,
    onError: (String) -> Unit
) {
    alcance.launch {
        try {
            val respuesta = RetrofitClient.apiService.iniciarSesion(
                LoginRequest(
                    correoElectronico = email.trim().lowercase(),
                    contrasena = pass
                )
            )
            val sesion = respuesta.body()?.data
            if (respuesta.isSuccessful && sesion != null) {
                SesionActual.token = sesion.token
                onSuccess(rolSeleccionado, sesion.usuario.nombreCompleto)
            } else {
                onError(mensajeDeError(respuesta.errorBody()?.string(), "Correo o contraseña incorrectos", respuesta.code()))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: IOException) {
            onError(SIN_CONEXION)
        } catch (e: Exception) {
            onError("Error inesperado: ${e.message}")
        }
    }
}