import { Pool, PoolClient } from "pg";

/** Lo mínimo que los repositorios necesitan: ejecutar una consulta SQL. */
export interface Consultable {
  query(texto: string, valores?: unknown[]): Promise<{ rows: any[] }>;
}

export const desdePool = (pool: Pool): Consultable => ({
  query: (texto, valores) => pool.query(texto, valores as any[]),
});

export const desdeCliente = (cliente: PoolClient): Consultable => ({
  query: (texto, valores) => cliente.query(texto, valores as any[]),
});
