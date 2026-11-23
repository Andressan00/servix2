import { Request, Response } from "express";
import { usuarioAutenticado } from "../middleware/autenticacion";
import { presentarSolicitud } from "../presenters/presentadores";
import { PostulacionService } from "../services/PostulacionService";
import { SolicitudService } from "../services/SolicitudService";
import { creado, ok } from "../shared/respuestas";
import {
  exigirUuid,
  validarAceptacion,
  validarCrearSolicitud,
  validarListado,
} from "../validators/validaciones";

export class SolicitudController {
  constructor(
    private readonly solicitudes: SolicitudService,
    private readonly postulaciones: PostulacionService
  ) {}

  /** POST /services (HU03, HU04, HU05, HU06) */
  crear = async (req: Request, res: Response): Promise<void> => {
    const usuario = usuarioAutenticado(req);
    const dto = validarCrearSolicitud(req.body);
    const solicitud = await this.solicitudes.crear(usuario, dto);
    creado(res, { solicitud: presentarSolicitud(solicitud, usuario.id) }, "Solicitud publicada");
  };

  /** GET /services?zona=&categoria=&page=&limit= (HU07) */
  listar = async (req: Request, res: Response): Promise<void> => {
    const usuario = usuarioAutenticado(req);
    const filtros = validarListado(req.query);
    const { items, total } = await this.solicitudes.listarDisponibles(filtros);
    ok(res, {
      items: items.map((s) => presentarSolicitud(s, usuario.id)),
      pagination: {
        page: filtros.pagina,
        limit: filtros.limite,
        total,
        totalPages: Math.ceil(total / filtros.limite),
      },
    });
  };

  /** GET /services/:id */
  detalle = async (req: Request, res: Response): Promise<void> => {
    const usuario = usuarioAutenticado(req);
    const solicitud = await this.solicitudes.obtener(exigirUuid(req.params.id));
    ok(res, { solicitud: presentarSolicitud(solicitud, usuario.id) });
  };

  /** POST /services/:id/applications (HU08) */
  postular = async (req: Request, res: Response): Promise<void> => {
    const usuario = usuarioAutenticado(req);
    const postulacion = await this.postulaciones.postular(usuario, exigirUuid(req.params.id));
    creado(res, { postulacion }, "Postulación registrada");
  };

  /** GET /services/:id/applications (solo el creador) */
  listarPostulaciones = async (req: Request, res: Response): Promise<void> => {
    const usuario = usuarioAutenticado(req);
    const items = await this.postulaciones.listarPostulaciones(usuario, exigirUuid(req.params.id));
    ok(res, { items, total: items.length });
  };

  /** PATCH /services/:id/accept (HU08) */
  aceptar = async (req: Request, res: Response): Promise<void> => {
    const usuario = usuarioAutenticado(req);
    const solicitudId = exigirUuid(req.params.id);
    const postulacionId = validarAceptacion(req.body);
    const resultado = await this.postulaciones.aceptar(usuario, solicitudId, postulacionId);
    ok(
      res,
      {
        solicitud: presentarSolicitud(resultado.solicitud, usuario.id),
        postulacion: resultado.postulacion,
      },
      "Trabajador aceptado. La solicitud está EN_PROCESO"
    );
  };
}
