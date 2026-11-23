package com.servix.app.data.model

import com.google.gson.Gson

/** Respuesta exitosa del backend: { success, data, message } */
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String?
)

/** Respuesta de error del backend: { success:false, error:{ code, message, details } } */
data class ApiErrorResponse(val error: ApiErrorBody?)
data class ApiErrorBody(
    val code: String?,
    val message: String?,
    val details: Map<String, String>?
)

/** Cuerpo de POST /services */
data class CrearSolicitudRequest(
    val titulo: String,
    val descripcion: String,
    val categoria: String,
    val precio: Double,
    val fecha: String,   // YYYY-MM-DD
    val hora: String,    // HH:mm
    val ciudad: String,
    val zona: String,
    val direccionReferencia: String? = null
)

data class Solicitud(
    val id: String,
    val titulo: String,
    val descripcion: String,
    val categoria: String,
    val precio: Double,
    val fecha: String,
    val hora: String,
    val ciudad: String,
    val zona: String,
    val estado: String,
    val creadoEn: String?
)

data class SolicitudCreada(val solicitud: Solicitud)

data class ListaSolicitudes(
    val items: List<Solicitud>,
    val pagination: Paginacion?
)

data class Paginacion(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

/** Convierte el JSON de error del backend en un mensaje legible para el usuario. */
fun mensajeDeError(cuerpo: String?, porDefecto: String, code: Int): String {
    if (cuerpo.isNullOrBlank()) return porDefecto
    return try {
        val error = Gson().fromJson(cuerpo, ApiErrorResponse::class.java)?.error
        val detalle = error?.details?.entries?.firstOrNull()
        when {
            detalle != null -> "${detalle.key}: ${detalle.value}"
            !error?.message.isNullOrBlank() -> error?.message ?: porDefecto
            else -> porDefecto
        }
    } catch (e: Exception) {
        porDefecto
    }
}
