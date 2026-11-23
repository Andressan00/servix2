import { PostulacionRepository, SolicitudRepository, UnitOfWork } from "../domain/puertos";
import {
  ESTADOS_POSTULACION,
  ESTADOS_SOLICITUD,
  Postulacion,
  PostulacionConTrabajador,
  Solicitud,
  Usuario,
} from "../domain/tipos";
import { ConflictError, ForbiddenError, NotFoundError } from "../shared/errors";

/** HU08: postularse a una solicitud y aceptar a un trabajador. */
export class PostulacionService {
  constructor(
    private readonly solicitudes: SolicitudRepository,
    private readonly postulaciones: PostulacionRepository,
    private readonly unidadDeTrabajo: UnitOfWork
  ) {}

  async postular(trabajador: Usuario, solicitudId: string): Promise<Postulacion> {
    const solicitud = await this.solicitudes.buscarPorId(solicitudId);
    if (!solicitud) throw new NotFoundError("SERVICE_NOT_FOUND", "La solicitud no existe");

    if (!trabajador.disponible) {
      throw new ConflictError("WORKER_NOT_AVAILABLE", "Activa tu disponibilidad para postularte");
    }
    if (solicitud.solicitanteId === trabajador.id) {
      throw new ConflictError("OWN_SERVICE", "No puedes postularte a tu propia solicitud");
    }
    if (solicitud.estado !== ESTADOS_SOLICITUD.PUBLICADO) {
      throw new ConflictError("SERVICE_NOT_AVAILABLE", "La solicitud ya no está disponible");
    }

    const postulacion = await this.postulaciones.crear(solicitud.id, trabajador.id);
    if (!postulacion) {
      throw new ConflictError("ALREADY_APPLIED", "Ya te postulaste a esta solicitud");
    }
    return postulacion;
  }

  async listarPostulaciones(
    solicitante: Usuario,
    solicitudId: string
  ): Promise<PostulacionConTrabajador[]> {
    const solicitud = await this.solicitudes.buscarPorId(solicitudId);
    if (!solicitud) throw new NotFoundError("SERVICE_NOT_FOUND", "La solicitud no existe");
    if (solicitud.solicitanteId !== solicitante.id) {
      throw new ForbiddenError("Solo el creador puede ver las postulaciones");
    }
    return this.postulaciones.listarPorSolicitud(solicitudId);
  }

  /**
   * Acepta una postulación. Todo ocurre en UNA transacción: o se completan los
   * tres cambios (aceptar, rechazar al resto, pasar a EN_PROCESO) o ninguno.
   * La fila de la solicitud se bloquea para que dos clics simultáneos no
   * acepten a dos trabajadores distintos.
   */
  aceptar(
    solicitante: Usuario,
    solicitudId: string,
    postulacionId: string
  ): Promise<{ solicitud: Solicitud; postulacion: Postulacion }> {
    return this.unidadDeTrabajo.ejecutar(async (repos) => {
      const solicitud = await repos.solicitudes.buscarPorIdParaActualizar(solicitudId);
      if (!solicitud) throw new NotFoundError("SERVICE_NOT_FOUND", "La solicitud no existe");
      if (solicitud.solicitanteId !== solicitante.id) {
        throw new ForbiddenError("Solo el creador puede aceptar un trabajador");
      }
      if (solicitud.estado !== ESTADOS_SOLICITUD.PUBLICADO) {
        throw new ConflictError("SERVICE_NOT_PUBLISHED", "La solicitud ya no está publicada");
      }

      const candidata = await repos.postulaciones.buscarPorId(postulacionId);
      if (!candidata || candidata.solicitudId !== solicitudId) {
        throw new NotFoundError("APPLICATION_NOT_FOUND", "La postulación no existe");
      }
      if (candidata.estado !== ESTADOS_POSTULACION.PENDIENTE) {
        throw new ConflictError("APPLICATION_NOT_PENDING", "La postulación ya fue resuelta");
      }

      const postulacion = await repos.postulaciones.marcarAceptada(candidata.id);
      await repos.postulaciones.rechazarOtras(solicitudId, candidata.id);
      const actualizada = await repos.solicitudes.asignarTrabajador(solicitudId, candidata.trabajadorId);
      return { solicitud: actualizada, postulacion };
    });
  }
}
