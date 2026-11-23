import { SolicitudRepository, Reloj } from "../domain/puertos";
import { CrearSolicitudDto, FiltrosListado, PaginaSolicitudes, Solicitud, Usuario } from "../domain/tipos";
import { NotFoundError, ValidationError } from "../shared/errors";

const ZONA_HORARIA_COLOMBIA = "-05:00";

export class SolicitudService {
  constructor(
    private readonly solicitudes: SolicitudRepository,
    private readonly reloj: Reloj
  ) {}

  /** HU03 + HU04 + HU05 + HU06 */
  async crear(solicitante: Usuario, dto: CrearSolicitudDto): Promise<Solicitud> {
    const momento = new Date(`${dto.fecha}T${dto.hora}:00${ZONA_HORARIA_COLOMBIA}`);
    if (momento.getTime() < this.reloj().getTime()) {
      throw new ValidationError("La fecha y hora del servicio no pueden estar en el pasado", {
        fecha: "Debe ser hoy (a una hora futura) o una fecha posterior",
      });
    }
    return this.solicitudes.crear({ ...dto, solicitanteId: solicitante.id });
  }

  /** HU07 */
  listarDisponibles(filtros: FiltrosListado): Promise<PaginaSolicitudes> {
    return this.solicitudes.listarPublicadas(filtros);
  }

  async obtener(id: string): Promise<Solicitud> {
    const solicitud = await this.solicitudes.buscarPorId(id);
    if (!solicitud) throw new NotFoundError("SERVICE_NOT_FOUND", "La solicitud no existe");
    return solicitud;
  }
}
