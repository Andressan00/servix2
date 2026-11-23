import { UsuarioRepository } from "../../domain/puertos";
import { NuevoUsuario, Usuario, UsuarioConCredenciales } from "../../domain/tipos";
import { Consultable } from "./consultable";

export const COLUMNAS_USUARIO =
  "id, nombre_completo, correo_electronico, telefono, estado_verificacion, disponible, reputacion_promedio, total_calificaciones";

export function mapearUsuario(f: any): Usuario {
  return {
    id: f.id,
    nombreCompleto: f.nombre_completo,
    correoElectronico: f.correo_electronico,
    telefono: f.telefono,
    estadoVerificacion: f.estado_verificacion,
    disponible: f.disponible,
    reputacionPromedio: Number(f.reputacion_promedio),
    totalCalificaciones: Number(f.total_calificaciones),
  };
}

export class PgUsuarioRepository implements UsuarioRepository {
  constructor(private readonly db: Consultable) {}

  async crear(d: NuevoUsuario): Promise<Usuario | null> {
    const { rows } = await this.db.query(
      `INSERT INTO usuarios (nombre_completo, correo_electronico, telefono, contrasena_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (correo_electronico) DO NOTHING
       RETURNING ${COLUMNAS_USUARIO}`,
      [d.nombreCompleto, d.correoElectronico, d.telefono, d.contrasenaHash]
    );
    return rows.length ? mapearUsuario(rows[0]) : null;
  }

  async buscarCredencialesPorCorreo(correo: string): Promise<UsuarioConCredenciales | null> {
    const { rows } = await this.db.query(
      `SELECT ${COLUMNAS_USUARIO}, contrasena_hash FROM usuarios WHERE correo_electronico = $1`,
      [correo]
    );
    if (rows.length === 0) return null;
    return { usuario: mapearUsuario(rows[0]), contrasenaHash: rows[0].contrasena_hash };
  }

  async actualizarDisponibilidad(id: string, disponible: boolean): Promise<Usuario> {
    const { rows } = await this.db.query(
      `UPDATE usuarios SET disponible = $2, actualizado_en = now()
        WHERE id = $1 RETURNING ${COLUMNAS_USUARIO}`,
      [id, disponible]
    );
    return mapearUsuario(rows[0]);
  }
}
