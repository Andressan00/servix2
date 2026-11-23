import { Pool } from "pg";
import { Repositorios, UnitOfWork } from "../../domain/puertos";
import { desdeCliente } from "./consultable";
import { PgPostulacionRepository } from "./PgPostulacionRepository";
import { PgSolicitudRepository } from "./PgSolicitudRepository";

/** Patrón Unit of Work: abre una transacción, entrega repositorios ligados a ella y confirma o revierte. */
export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query("BEGIN");
      const db = desdeCliente(cliente);
      const resultado = await trabajo({
        solicitudes: new PgSolicitudRepository(db),
        postulaciones: new PgPostulacionRepository(db),
      });
      await cliente.query("COMMIT");
      return resultado;
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    } finally {
      cliente.release();
    }
  }
}
