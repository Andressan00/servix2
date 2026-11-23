package com.servix.app.data.remote

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    // 10.0.2.2 = tu computador visto desde el emulador de Android Studio.
    private const val BASE_URL = "http://10.0.2.2:3000/api/v1/"

    /**
     * Agrega a cada petición el token de la sesión: Authorization: Bearer <token>.
     * En register y login todavía no hay token, así que se envían sin él.
     */
    private val tokenInterceptor = Interceptor { chain ->
        val token = SesionActual.token
        val peticion = if (token != null) {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        chain.proceed(peticion)
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(tokenInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val apiService: ServicioApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(httpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ServicioApi::class.java)
    }
}