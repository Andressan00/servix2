import "dotenv/config";

/** Falla rápido (fail fast): si falta una variable, el servidor no arranca. */
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable ${nombre} en el archivo .env`);
  }
  return valor;
}

/** Toda la configuración vive en un solo lugar; ninguna otra capa lee process.env. */
export const config = {
  puerto: Number(process.env.PORT) || 3000,
  databaseUrl: requerida("DATABASE_URL"),
  version: "1.0.0",
};
