import { SesionRepository } from "../../domain/puertos";
import { Usuario } from "../../domain/tipos";
import { Consultable } from "./consultable";
import { COLUMNAS_USUARIO, mapearUsuario } from "./PgUsuarioRepository";

// "id, nombre" -> "u.id, u.nombre" para usarlas dentro de un JOIN
const COLUMNAS_U = COLUMNAS_USUARIO.replace(/(\w+)/g, "u.$1");

export class PgSesionRepository implements SesionRepository {
  constructor(private readonly db: Consultable) {}

  async crear(usuarioId: string, huellaToken: string, expiraEn: Date): Promise<void> {
    await this.db.query(
      "INSERT INTO sesiones (usuario_id, token_hash, expira_en) VALUES ($1, $2, $3)",
      [usuarioId, huellaToken, expiraEn]
    );
  }

  async buscarUsuarioPorHuella(huellaToken: string, ahora: Date): Promise<Usuario | null> {
    const { rows } = await this.db.query(
      `SELECT ${COLUMNAS_U}
         FROM sesiones s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = $1 AND s.expira_en > $2`,
      [huellaToken, ahora]
    );
    return rows.length ? mapearUsuario(rows[0]) : null;
  }
}
