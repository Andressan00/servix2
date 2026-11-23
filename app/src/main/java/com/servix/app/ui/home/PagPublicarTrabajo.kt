package com.servix.app.ui.home

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.servix.app.data.model.CrearSolicitudRequest
import com.servix.app.data.model.mensajeDeError
import com.servix.app.data.remote.RetrofitClient
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.io.IOException
import java.util.Calendar
import java.util.Locale

private val PublishPrimary = Color(0xFF6A1B9A)
private val PublishDark = Color(0xFF4A148C)
private val PublishBackground = Color(0xFFF5F2F9)

/** Envía la solicitud al backend. Devuelve null si salió bien, o el mensaje de error. */
private suspend fun publicarSolicitud(solicitud: CrearSolicitudRequest): String? {
    return try {
        val respuesta = RetrofitClient.apiService.crearSolicitud(solicitud)
        if (respuesta.isSuccessful) {
            null
        } else {
            mensajeDeError(
                respuesta.errorBody()?.string(),
                "No se pudo publicar la solicitud",
                respuesta.code()
            )
        }
    } catch (e: CancellationException) {
        throw e
    } catch (e: IOException) {
        "No se pudo conectar con el servidor. ¿Está encendido el backend?"
    } catch (e: Exception) {
        "Error inesperado: ${e.message}"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PagPublicarTrabajo(
    nombreCliente: String = "Cliente",
    onVolver: () -> Unit = {},
    onTrabajoExitoso: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var titulo by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    var categoria by remember { mutableStateOf("Electricidad") }
    var zona by remember { mutableStateOf("Chapinero") }
    var precio by remember { mutableStateOf("") }
    var fecha by remember { mutableStateOf("") } // YYYY-MM-DD
    var hora by remember { mutableStateOf("") }  // HH:mm
    var isSubiendo by remember { mutableStateOf(false) }

    // Opciones rápidas de categorías y zonas
    val categoriasDisponibles = listOf("Electricidad", "Plomería", "Electrodomésticos", "Limpieza", "Carpintería")
    val zonasBogota = listOf("Chapinero", "Usaquén", "Suba", "Teusaquillo", "Centro / Santa Fe", "Engativá")

    var expandedCat by remember { mutableStateOf(false) }
    var expandedZona by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Publicar nueva solicitud", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onVolver) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Volver",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = PublishPrimary)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(PublishBackground)
                .padding(paddingValues)
                .padding(20.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "¿Qué servicio necesitas hoy?",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = PublishDark
            )
            Text(
                text = "Completa los detalles para que los profesionales en Bogotá puedan postularse rápidamente.",
                fontSize = 13.sp,
                color = Color.Gray
            )

            Spacer(modifier = Modifier.height(4.dp))

            OutlinedTextField(
                value = titulo,
                onValueChange = { titulo = it },
                label = { Text("Título del trabajo (ej. Reparación de cortocircuito)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PublishPrimary,
                    focusedLabelColor = PublishPrimary
                )
            )

            ExposedDropdownMenuBox(
                expanded = expandedCat,
                onExpandedChange = { expandedCat = !expandedCat }
            ) {
                OutlinedTextField(
                    value = categoria,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Categoría del servicio") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    shape = RoundedCornerShape(12.dp)
                )
                ExposedDropdownMenu(
                    expanded = expandedCat,
                    onDismissRequest = { expandedCat = false }
                ) {
                    categoriasDisponibles.forEach { cat ->
                        DropdownMenuItem(
                            text = { Text(cat) },
                            onClick = {
                                categoria = cat
                                expandedCat = false
                            }
                        )
                    }
                }
            }

            ExposedDropdownMenuBox(
                expanded = expandedZona,
                onExpandedChange = { expandedZona = !expandedZona }
            ) {
                OutlinedTextField(
                    value = zona,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Zona / Localidad en Bogotá") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    shape = RoundedCornerShape(12.dp)
                )
                ExposedDropdownMenu(
                    expanded = expandedZona,
                    onDismissRequest = { expandedZona = false }
                ) {
                    zonasBogota.forEach { z ->
                        DropdownMenuItem(
                            text = { Text(z) },
                            onClick = {
                                zona = z
                                expandedZona = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = descripcion,
                onValueChange = { descripcion = it },
                label = { Text("Descripción detallada del problema") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp),
                shape = RoundedCornerShape(12.dp),
                maxLines = 5
            )

            // HU04: precio
            OutlinedTextField(
                value = precio,
                onValueChange = { nuevo -> precio = nuevo.filter { it.isDigit() } },
                label = { Text("Precio que ofreces (COP)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )

            // HU05: fecha y hora con selectores
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = {
                        val hoy = Calendar.getInstance()
                        val dialogo = DatePickerDialog(
                            context,
                            { _, anio, mes, dia ->
                                fecha = String.format(Locale.US, "%04d-%02d-%02d", anio, mes + 1, dia)
                            },
                            hoy.get(Calendar.YEAR),
                            hoy.get(Calendar.MONTH),
                            hoy.get(Calendar.DAY_OF_MONTH)
                        )
                        dialogo.datePicker.minDate = System.currentTimeMillis() - 1000
                        dialogo.show()
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (fecha.isEmpty()) "Elegir fecha" else fecha, color = PublishPrimary)
                }

                OutlinedButton(
                    onClick = {
                        TimePickerDialog(
                            context,
                            { _, h, m -> hora = String.format(Locale.US, "%02d:%02d", h, m) },
                            12,
                            0,
                            true
                        ).show()
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (hora.isEmpty()) "Elegir hora" else hora, color = PublishPrimary)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = {
                    if (titulo.isBlank() || descripcion.isBlank() || precio.isBlank() ||
                        fecha.isBlank() || hora.isBlank()
                    ) {
                        Toast.makeText(context, "Por favor completa todos los campos", Toast.LENGTH_SHORT).show()
                        return@Button
                    }

                    val solicitud = CrearSolicitudRequest(
                        titulo = titulo.trim(),
                        descripcion = descripcion.trim(),
                        categoria = categoria,
                        precio = precio.toDoubleOrNull() ?: 0.0,
                        fecha = fecha,
                        hora = hora,
                        ciudad = "Bogotá",
                        zona = zona
                    )

                    isSubiendo = true
                    scope.launch {
                        val error = publicarSolicitud(solicitud)
                        isSubiendo = false
                        if (error == null) {
                            Toast.makeText(context, "¡Trabajo publicado con éxito!", Toast.LENGTH_SHORT).show()
                            onTrabajoExitoso() // Regresa a la vista principal
                        } else {
                            Toast.makeText(context, error, Toast.LENGTH_LONG).show()
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PublishPrimary),
                enabled = !isSubiendo
            ) {
                if (isSubiendo) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Text(text = "Publicar Solicitud", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}