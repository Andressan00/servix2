package com.servix.app.data.remote

/**
 * Guarda el token de la sesión mientras la app está abierta.
 * La app pide iniciar sesión cada vez que se abre, así que basta con guardarlo en memoria.
 */
object SesionActual {
    @Volatile
    var token: String? = null

    fun cerrar() {
        token = null
    }
}