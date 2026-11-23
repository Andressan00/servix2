import {
  GestorTokens,
  HasherContrasena,
  Reloj,
  SesionRepository,
  UsuarioRepository,
} from "../domain/puertos";
import { LoginDto, RegistroDto, SesionIniciada, Usuario } from "../domain/tipos";
import { ConflictError, UnauthorizedError } from "../shared/errors";

const DURACION_SESION_MS = 8 * 60 * 60 * 1000; // 8 horas, como define el contrato

/** RF01: registro, inicio de sesión y verificación del token de cada petición. */
export class AuthService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly sesiones: SesionRepository,
    private readonly hasher: HasherContrasena,
    private readonly tokens: GestorTokens,
    private readonly reloj: Reloj
  ) {}

  async registrar(dto: RegistroDto): Promise<SesionIniciada> {
    const contrasenaHash = await this.hasher.hash(dto.contrasena);
    const usuario = await this.usuarios.crear({
      nombreCompleto: dto.nombreCompleto,
      correoElectronico: dto.correoElectronico,
      telefono: dto.telefono,
      contrasenaHash,
    });
    if (!usuario) {
      throw new ConflictError("EMAIL_ALREADY_REGISTERED", "El correo ya está registrado");
    }
    return { usuario, token: await this.abrirSesion(usuario.id) };
  }

  async iniciarSesion(dto: LoginDto): Promise<SesionIniciada> {
    const credenciales = await this.usuarios.buscarCredencialesPorCorreo(dto.correoElectronico);
    const valida =
      credenciales !== null &&
      (await this.hasher.verificar(dto.contrasena, credenciales.contrasenaHash));
    if (!credenciales || !valida) {
      // Mismo error si el correo no existe o la contraseña falla: no revela cuál fue.
      throw new UnauthorizedError("INVALID_CREDENTIALS", "Correo o contraseña incorrectos");
    }
    return { usuario: credenciales.usuario, token: await this.abrirSesion(credenciales.usuario.id) };
  }

  /** Lo usa el middleware: convierte un token en el usuario autenticado. */
  async autenticar(token: string): Promise<Usuario> {
    const usuario = await this.sesiones.buscarUsuarioPorHuella(this.tokens.huella(token), this.reloj());
    if (!usuario) throw new UnauthorizedError("INVALID_TOKEN", "Token inválido o vencido");
    return usuario;
  }

  private async abrirSesion(usuarioId: string): Promise<string> {
    const token = this.tokens.generar();
    const expiraEn = new Date(this.reloj().getTime() + DURACION_SESION_MS);
    await this.sesiones.crear(usuarioId, this.tokens.huella(token), expiraEn);
    return token;
  }
}
