import { SolicitudRepository } from "../../domain/puertos";
import { FiltrosListado, NuevaSolicitud, PaginaSolicitudes, Solicitud } from "../../domain/tipos";
import { Consultable } from "./consultable";

const COLUMNAS = `id, solicitante_id, titulo, descripcion, categoria, precio,
  to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, ciudad, zona, direccion_referencia,
  estado, trabajador_aceptado_id, creado_en`;

function mapear(f: any): Solicitud {
  return {
    id: f.id,
    solicitanteId: f.solicitante_id,
    titulo: f.titulo,
    descripcion: f.descripcion,
    categoria: f.categoria,
    precio: Number(f.precio),
    fecha: f.fecha,
    hora: f.hora,
    ciudad: f.ciudad,
    zona: f.zona,
    direccionReferencia: f.direccion_referencia,
    estado: f.estado,
    trabajadorAceptadoId: f.trabajador_aceptado_id,
    creadoEn: new Date(f.creado_en).toISOString(),
  };
}

export class PgSolicitudRepository implements SolicitudRepository {
  constructor(private readonly db: Consultable) {}

  async crear(d: NuevaSolicitud): Promise<Solicitud> {
    const { rows } = await this.db.query(
      `INSERT INTO solicitudes
         (solicitante_id, titulo, descripcion, categoria, precio, fecha, hora,
          ciudad, zona, direccion_referencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING ${COLUMNAS}`,
      [d.solicitanteId, d.titulo, d.descripcion, d.categoria, d.precio, d.fecha, d.hora,
       d.ciudad, d.zona, d.direccionReferencia ?? null]
    );
    return mapear(rows[0]);
  }

  async buscarPorId(id: string): Promise<Solicitud | null> {
    const { rows } = await this.db.query(`SELECT ${COLUMNAS} FROM solicitudes WHERE id = $1`, [id]);
    return rows.length ? mapear(rows[0]) : null;
  }

  async buscarPorIdParaActualizar(id: string): Promise<Solicitud | null> {
    const { rows } = await this.db.query(
      `SELECT ${COLUMNAS} FROM solicitudes WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return rows.length ? mapear(rows[0]) : null;
  }

  async listarPublicadas(f: FiltrosListado): Promise<PaginaSolicitudes> {
    const condiciones = ["estado = 'PUBLICADO'"];
    const valores: unknown[] = [];
    if (f.zona) {
      valores.push(f.zona);
      condiciones.push(`lower(zona) = lower($${valores.length})`);
    }
    if (f.categoria) {
      valores.push(f.categoria);
      condiciones.push(`lower(categoria) = lower($${valores.length})`);
    }
    const donde = condiciones.join(" AND ");

    const conteo = await this.db.query(
      `SELECT count(*)::int AS total FROM solicitudes WHERE ${donde}`,
      valores
    );

    valores.push(f.limite, (f.pagina - 1) * f.limite);
    const { rows } = await this.db.query(
      `SELECT ${COLUMNAS} FROM solicitudes WHERE ${donde}
        ORDER BY creado_en DESC
        LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
      valores
    );
    return { items: rows.map(mapear), total: conteo.rows[0].total };
  }

  async asignarTrabajador(id: string, trabajadorId: string): Promise<Solicitud> {
    const { rows } = await this.db.query(
      `UPDATE solicitudes
          SET estado = 'EN_PROCESO', trabajador_aceptado_id = $2, actualizado_en = now()
        WHERE id = $1
        RETURNING ${COLUMNAS}`,
      [id, trabajadorId]
    );
    return mapear(rows[0]);
  }
}
