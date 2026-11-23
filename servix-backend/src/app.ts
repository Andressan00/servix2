import cors from "cors";
import express, { Express } from "express";
import { AuthController } from "./controllers/AuthController";
import { SolicitudController } from "./controllers/SolicitudController";
import { UsuarioController } from "./controllers/UsuarioController";
import { crearAutenticacion } from "./middleware/autenticacion";
import { manejarErrores, manejarRutaInexistente } from "./middleware/errores";
import { exigirJson } from "./middleware/json";
import { crearRutas } from "./routes/rutas";
import { AuthService } from "./services/AuthService";
import { PostulacionService } from "./services/PostulacionService";
import { SolicitudService } from "./services/SolicitudService";
import { UsuarioService } from "./services/UsuarioService";

export interface DependenciasApp {
  version: string;
  auth: AuthService;
  usuarios: UsuarioService;
  solicitudes: SolicitudService;
  postulaciones: PostulacionService;
}

/**
 * Arma la aplicación Express con las dependencias que le entregan.
 * No conoce Postgres ni la forma de guardar contraseñas: por eso las pruebas pueden usar versiones falsas.
 */
export function crearApp(d: DependenciasApp): Express {
  const app = express();
  app.use(cors());
  app.use(exigirJson);
  app.use(express.json({ limit: "100kb" }));

  app.use(
    "/api/v1",
    crearRutas({
      version: d.version,
      autenticar: crearAutenticacion(d.auth),
      auth: new AuthController(d.auth),
      usuarios: new UsuarioController(d.usuarios),
      solicitudes: new SolicitudController(d.solicitudes, d.postulaciones),
    })
  );

  app.use(manejarRutaInexistente);
  app.use(manejarErrores);
  return app;
}
