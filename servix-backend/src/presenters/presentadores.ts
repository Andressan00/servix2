import { Solicitud, Usuario } from "../domain/tipos";

/**
 * Los presentadores deciden QUÉ datos salen hacia el cliente.
 * Así el modelo interno (ej. el hash de la contraseña) nunca se filtra por accidente.
 */

/** Perfil del propio usuario (incluye correo y teléfono). */
export function presentarUsuarioPropio(u: Usuario) {
  return {
    id: u.id,
    nombreCompleto: u.nombreCompleto,
    correoElectronico: u.correoElectronico,
    telefono: u.telefono,
    estadoVerificacion: u.estadoVerificacion,
    disponible: u.disponible,
    reputacionPromedio: u.reputacionPromedio,
    totalCalificaciones: u.totalCalificaciones,
  };
}

/** La dirección específica solo la ven el solicitante y el trabajador aceptado. */
export function presentarSolicitud(s: Solicitud, espectadorId: string) {
  const puedeVerDireccion =
    s.solicitanteId === espectadorId || s.trabajadorAceptadoId === espectadorId;
  if (puedeVerDireccion) return s;
  const { direccionReferencia, ...publica } = s;
  return publica;
}
