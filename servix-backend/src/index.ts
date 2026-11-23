import { Pool } from "pg";
import { crearApp } from "./app";
import { config } from "./config/env";
import { Reloj } from "./domain/puertos";
import { CryptoGestorTokens } from "./infrastructure/crypto/CryptoGestorTokens";
import { ScryptHasher } from "./infrastructure/crypto/ScryptHasher";
import { desdePool } from "./infrastructure/pg/consultable";
import { PgPostulacionRepository } from "./infrastructure/pg/PgPostulacionRepository";
import { PgSesionRepository } from "./infrastructure/pg/PgSesionRepository";
import { PgSolicitudRepository } from "./infrastructure/pg/PgSolicitudRepository";
import { PgUnitOfWork } from "./infrastructure/pg/PgUnitOfWork";
import { PgUsuarioRepository } from "./infrastructure/pg/PgUsuarioRepository";
import { AuthService } from "./services/AuthService";
import { PostulacionService } from "./services/PostulacionService";
import { SolicitudService } from "./services/SolicitudService";
import { UsuarioService } from "./services/UsuarioService";

/**
 * COMPOSITION ROOT: el único lugar que conoce las clases concretas.
 * Aquí se crean los objetos y se "inyectan" unos en otros.
 */
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: true },
});
// Neon cierra conexiones inactivas; sin este manejador el proceso podría caerse.
pool.on("error", (error) => console.error("Error en conexión inactiva de la BD:", error.message));

const db = desdePool(pool);
const reloj: Reloj = () => new Date();

const usuariosRepo = new PgUsuarioRepository(db);
const solicitudesRepo = new PgSolicitudRepository(db);
const postulacionesRepo = new PgPostulacionRepository(db);

const app = crearApp({
  version: config.version,
  auth: new AuthService(
    usuariosRepo,
    new PgSesionRepository(db),
    new ScryptHasher(),
    new CryptoGestorTokens(),
    reloj
  ),
  usuarios: new UsuarioService(usuariosRepo),
  solicitudes: new SolicitudService(solicitudesRepo, reloj),
  postulaciones: new PostulacionService(solicitudesRepo, postulacionesRepo, new PgUnitOfWork(pool)),
});

app.listen(config.puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${config.puerto}/api/v1/health`);
});
