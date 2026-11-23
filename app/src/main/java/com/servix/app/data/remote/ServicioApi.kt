package com.servix.app.data.remote

import com.servix.app.data.model.ApiResponse
import com.servix.app.data.model.CrearSolicitudRequest
import com.servix.app.data.model.ListaSolicitudes
import com.servix.app.data.model.LoginRequest
import com.servix.app.data.model.RegistroRequest
import com.servix.app.data.model.SesionDto
import com.servix.app.data.model.SolicitudCreada
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/** Rutas relativas a BASE_URL (http://10.0.2.2:3000/api/v1/). */
interface ServicioApi {

    /** RF01: crear cuenta. Devuelve el usuario y su token. */
    @POST("auth/register")
    suspend fun registrar(
        @Body body: RegistroRequest
    ): Response<ApiResponse<SesionDto>>

    /** Iniciar sesión. Devuelve el usuario y su token. */
    @POST("auth/login")
    suspend fun iniciarSesion(
        @Body body: LoginRequest
    ): Response<ApiResponse<SesionDto>>

    /** HU03/HU04/HU05/HU06: publicar una solicitud (queda guardada en Neon). */
    @POST("services")
    suspend fun crearSolicitud(
        @Body body: CrearSolicitudRequest
    ): Response<ApiResponse<SolicitudCreada>>

    /** HU07: solicitudes PUBLICADAS, con filtros opcionales por zona y categoría. */
    @GET("services")
    suspend fun listarSolicitudes(
        @Query("zona") zona: String? = null,
        @Query("categoria") categoria: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<ApiResponse<ListaSolicitudes>>
}