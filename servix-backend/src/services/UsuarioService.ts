import { UsuarioRepository } from "../domain/puertos";
import { Usuario } from "../domain/tipos";

export class UsuarioService {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async cambiarDisponibilidad(usuario: Usuario, disponible: boolean): Promise<Usuario> {
    return this.usuarios.actualizarDisponibilidad(usuario.id, disponible);
  }
}
