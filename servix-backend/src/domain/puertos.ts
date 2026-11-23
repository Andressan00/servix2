import {
  FiltrosListado,
  NuevaSolicitud,
  NuevoUsuario,
  PaginaSolicitudes,
  Postulacion,
  PostulacionConTrabajador,
  Solicitud,
  Usuario,
  UsuarioConCredenciales,
} from "./tipos";

/**
 * PUERTOS (interfaces) que el dominio necesita del mundo exterior.
 * Los servicios dependen de estas abstracciones, no de Postgres ni de librerías concretas
 * (Principio de Inversión de Dependencias). Las implementaciones reales viven
 * en /infrastructure y las falsas (para pruebas) en /tests.
 */

export interface UsuarioRepository {
  /** Devuelve null si el correo ya estaba registrado. */
  crear(datos: NuevoUsuario): Promise<Usuario | null>;
  buscarCredencialesPorCorreo(correo: string): Promise<UsuarioConCredenciales | null>;
  actualizarDisponibilidad(id: string, disponible: boolean): Promise<Usuario>;
}

export interface SesionRepository {
  crear(usuarioId: string, huellaToken: string, expiraEn: Date): Promise<void>;
  /** Devuelve el usuario dueño del token si la sesión no ha vencido. */
  buscarUsuarioPorHuella(huellaToken: string, ahora: Date): Promise<Usuario | null>;
}

/** Cómo se protege la contraseña (el servicio no sabe si es scrypt, bcrypt, etc.). */
export interface HasherContrasena {
  hash(contrasena: string): Promise<string>;
  verificar(contrasena: string, hash: string): Promise<boolean>;
}

/** Genera tokens de sesión y calcula su "huella": en la BD solo se guarda la huella, nunca el token. */
export interface GestorTokens {
  generar(): string;
  huella(token: string): string;
}

export interface SolicitudRepository {
  crear(datos: NuevaSolicitud): Promise<Solicitud>;
  buscarPorId(id: string): Promise<Solicitud | null>;
  /** Igual que buscarPorId pero bloquea la fila dentro de una transacción. */
  buscarPorIdParaActualizar(id: string): Promise<Solicitud | null>;
  listarPublicadas(filtros: FiltrosListado): Promise<PaginaSolicitudes>;
  asignarTrabajador(id: string, trabajadorId: string): Promise<Solicitud>;
}

export interface PostulacionRepository {
  /** Devuelve null si el trabajador ya estaba postulado. */
  crear(solicitudId: string, trabajadorId: string): Promise<Postulacion | null>;
  buscarPorId(id: string): Promise<Postulacion | null>;
  listarPorSolicitud(solicitudId: string): Promise<PostulacionConTrabajador[]>;
  marcarAceptada(id: string): Promise<Postulacion>;
  rechazarOtras(solicitudId: string, exceptoId: string): Promise<void>;
}

export interface Repositorios {
  solicitudes: SolicitudRepository;
  postulaciones: PostulacionRepository;
}

/** Unidad de trabajo: todo lo que ocurra dentro se confirma o se revierte junto. */
export interface UnitOfWork {
  ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T>;
}

/** El reloj se inyecta para poder probar reglas que dependen de la fecha actual. */
export type Reloj = () => Date;
