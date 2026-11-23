// Modelo de dominio: no depende de Express, de Postgres ni de ninguna librería.

export const ESTADOS_SOLICITUD = {
  PUBLICADO: "PUBLICADO",
  EN_PROCESO: "EN_PROCESO",
  PAGADO: "PAGADO",
  COMPLETADO: "COMPLETADO",
  CANCELADO: "CANCELADO",
} as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[keyof typeof ESTADOS_SOLICITUD];

export const ESTADOS_POSTULACION = {
  PENDIENTE: "PENDIENTE",
  ACEPTADA: "ACEPTADA",
  RECHAZADA: "RECHAZADA",
} as const;
export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[keyof typeof ESTADOS_POSTULACION];

export type EstadoVerificacion = "NO_VERIFICADO" | "PENDIENTE" | "VERIFICADO";

export interface Usuario {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string | null;
  estadoVerificacion: EstadoVerificacion;
  disponible: boolean;
  reputacionPromedio: number;
  totalCalificaciones: number;
}

/** Datos que se pueden mostrar a otros usuarios (sin correo ni teléfono). */
export interface PerfilPublico {
  id: string;
  nombreCompleto: string;
  estadoVerificacion: EstadoVerificacion;
  reputacionPromedio: number;
  totalCalificaciones: number;
}

export interface NuevoUsuario {
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string;
  contrasenaHash: string;
}

/** DTO de registro (ya validado). */
export interface RegistroDto {
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string;
  contrasena: string;
}

/** DTO de inicio de sesión (ya validado). */
export interface LoginDto {
  correoElectronico: string;
  contrasena: string;
}

export interface UsuarioConCredenciales {
  usuario: Usuario;
  contrasenaHash: string;
}

/** Resultado de registrarse o iniciar sesión. */
export interface SesionIniciada {
  usuario: Usuario;
  token: string;
}

/** DTO: lo que el cliente envía para publicar una solicitud. */
export interface CrearSolicitudDto {
  titulo: string;
  descripcion: string;
  categoria: string;
  precio: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  ciudad: string;
  zona: string;
  direccionReferencia?: string;
}

export interface NuevaSolicitud extends CrearSolicitudDto {
  solicitanteId: string;
}

export interface Solicitud {
  id: string;
  solicitanteId: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  precio: number;
  fecha: string;
  hora: string;
  ciudad: string;
  zona: string;
  direccionReferencia: string | null;
  estado: EstadoSolicitud;
  trabajadorAceptadoId: string | null;
  creadoEn: string;
}

export interface FiltrosListado {
  zona?: string;
  categoria?: string;
  pagina: number;
  limite: number;
}

export interface PaginaSolicitudes {
  items: Solicitud[];
  total: number;
}

export interface Postulacion {
  id: string;
  solicitudId: string;
  trabajadorId: string;
  estado: EstadoPostulacion;
  creadoEn: string;
}

export interface PostulacionConTrabajador extends Postulacion {
  trabajador: PerfilPublico;
}
