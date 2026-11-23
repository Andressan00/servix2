import { Request, Response } from "express";
import { usuarioAutenticado } from "../middleware/autenticacion";
import { presentarUsuarioPropio } from "../presenters/presentadores";
import { UsuarioService } from "../services/UsuarioService";
import { ok } from "../shared/respuestas";
import { validarDisponibilidad } from "../validators/validaciones";

export class UsuarioController {
  constructor(private readonly usuarios: UsuarioService) {}

  /** PATCH /me/availability */
  disponibilidad = async (req: Request, res: Response): Promise<void> => {
    const disponible = validarDisponibilidad(req.body);
    const usuario = await this.usuarios.cambiarDisponibilidad(usuarioAutenticado(req), disponible);
    ok(res, { usuario: presentarUsuarioPropio(usuario) }, "Disponibilidad actualizada");
  };
}
