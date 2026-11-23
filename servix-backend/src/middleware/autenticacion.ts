import { Request, RequestHandler } from "express";
import { Usuario } from "../domain/tipos";
import { AuthService } from "../services/AuthService";
import { UnauthorizedError } from "../shared/errors";

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}

/**
 * Lee "Authorization: Bearer <token>", pide al AuthService que lo valide
 * y deja el usuario en req.usuario.
 */
export function crearAutenticacion(auth: AuthService): RequestHandler {
  return async (req, _res, next) => {
    try {
      const partes = (req.header("authorization") || "").split(" ");
      const token = partes[1];
      if (partes[0].toLowerCase() !== "bearer" || !token) {
        throw new UnauthorizedError("TOKEN_REQUIRED", "Falta el token Bearer");
      }
      req.usuario = await auth.autenticar(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function usuarioAutenticado(req: Request): Usuario {
  if (!req.usuario) throw new UnauthorizedError("TOKEN_REQUIRED", "Falta autenticación");
  return req.usuario;
}
