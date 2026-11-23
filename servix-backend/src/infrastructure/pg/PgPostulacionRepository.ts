import { PostulacionRepository } from "../../domain/puertos";
import { Postulacion, PostulacionConTrabajador } from "../../domain/tipos";
import { Consultable } from "./consultable";

const COLUMNAS = "id, solicitud_id, trabajador_id, estado, creado_en";

function mapear(f: any): Postulacion {
  return {
    id: f.id,
    solicitudId: f.solicitud_id,
    trabajadorId: f.trabajador_id,
    estado: f.estado,
    creadoEn: new Date(f.creado_en).toISOString(),
  };
}

export class PgPostulacionRepository implements PostulacionRepository {
  constructor(private readonly db: Consultable) {}

  async crear(solicitudId: string, trabajadorId: string): Promise<Postulacion | null> {
    const { rows } = await this.db.query(
      `INSERT INTO postulaciones (solicitud_id, trabajador_id)
       VALUES ($1, $2)
       ON CONFLICT (solicitud_id, trabajador_id) DO NOTHING
       RETURNING ${COLUMNAS}`,
      [solicitudId, trabajadorId]
    );
    return rows.length ? mapear(rows[0]) : null;
  }

  async buscarPorId(id: string): Promise<Postulacion | null> {
    const { rows } = await this.db.query(`SELECT ${COLUMNAS} FROM postulaciones WHERE id = $1`, [id]);
    return rows.length ? mapear(rows[0]) : null;
  }

  async listarPorSolicitud(solicitudId: string): Promise<PostulacionConTrabajador[]> {
    const { rows } = await this.db.query(
      `SELECT p.id, p.solicitud_id, p.trabajador_id, p.estado, p.creado_en,
              u.nombre_completo, u.estado_verificacion, u.reputacion_promedio, u.total_calificaciones
         FROM postulaciones p
         JOIN usuarios u ON u.id = p.trabajador_id
        WHERE p.solicitud_id = $1
        ORDER BY p.creado_en`,
      [solicitudId]
    );
    return rows.map((f) => ({
      ...mapear(f),
      trabajador: {
        id: f.trabajador_id,
        nombreCompleto: f.nombre_completo,
        estadoVerificacion: f.estado_verificacion,
        reputacionPromedio: Number(f.reputacion_promedio),
        totalCalificaciones: Number(f.total_calificaciones),
      },
    }));
  }

  async marcarAceptada(id: string): Promise<Postulacion> {
    const { rows } = await this.db.query(
      `UPDATE postulaciones SET estado = 'ACEPTADA', actualizado_en = now()
        WHERE id = $1 RETURNING ${COLUMNAS}`,
      [id]
    );
    return mapear(rows[0]);
  }

  async rechazarOtras(solicitudId: string, exceptoId: string): Promise<void> {
    await this.db.query(
      `UPDATE postulaciones SET estado = 'RECHAZADA', actualizado_en = now()
        WHERE solicitud_id = $1 AND id <> $2 AND estado = 'PENDIENTE'`,
      [solicitudId, exceptoId]
    );
  }
}
