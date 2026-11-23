import { Request, Response } from "express";
import { presentarUsuarioPropio } from "../presenters/presentadores";
import { AuthService } from "../services/AuthService";
import { creado, ok } from "../shared/respuestas";
import { validarLogin, validarRegistro } from "../validators/validaciones";

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register */
  registrar = async (req: Request, res: Response): Promise<void> => {
    const sesion = await this.auth.registrar(validarRegistro(req.body));
    creado(res, { usuario: presentarUsuarioPropio(sesion.usuario), token: sesion.token }, "Cuenta creada");
  };

  /** POST /auth/login */
  iniciarSesion = async (req: Request, res: Response): Promise<void> => {
    const sesion = await this.auth.iniciarSesion(validarLogin(req.body));
    ok(res, { usuario: presentarUsuarioPropio(sesion.usuario), token: sesion.token }, "Sesión iniciada");
  };
}
