import { RequestHandler, Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { SolicitudController } from "../controllers/SolicitudController";
import { UsuarioController } from "../controllers/UsuarioController";
import { ok } from "../shared/respuestas";

export interface DependenciasRutas {
  version: string;
  autenticar: RequestHandler;
  auth: AuthController;
  usuarios: UsuarioController;
  solicitudes: SolicitudController;
}

/** Mapa de la API: aquí se ve de un vistazo qué ruta llama a qué controlador. */
export function crearRutas(d: DependenciasRutas): Router {
  const r = Router();

  r.get("/health", (_req, res) => ok(res, { status: "ok", version: d.version }));

  r.post("/auth/register", d.auth.registrar);
  r.post("/auth/login", d.auth.iniciarSesion);
  r.patch("/me/availability", d.autenticar, d.usuarios.disponibilidad);

  r.get("/services", d.autenticar, d.solicitudes.listar);
  r.post("/services", d.autenticar, d.solicitudes.crear);
  r.get("/services/:id", d.autenticar, d.solicitudes.detalle);
  r.post("/services/:id/applications", d.autenticar, d.solicitudes.postular);
  r.get("/services/:id/applications", d.autenticar, d.solicitudes.listarPostulaciones);
  r.patch("/services/:id/accept", d.autenticar, d.solicitudes.aceptar);

  return r;
}
