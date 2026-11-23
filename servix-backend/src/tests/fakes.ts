import {
  GestorTokens,
  HasherContrasena,
  PostulacionRepository,
  Repositorios,
  SesionRepository,
  SolicitudRepository,
  UnitOfWork,
  UsuarioRepository,
} from "../domain/puertos";
import {
  FiltrosListado,
  NuevaSolicitud,
  NuevoUsuario,
  PaginaSolicitudes,
  Postulacion,
  PostulacionConTrabajador,
  Solicitud,
  Usuario,
  UsuarioConCredenciales,
} from "../domain/tipos";
import { AuthService } from "../services/AuthService";
import { PostulacionService } from "../services/PostulacionService";
import { SolicitudService } from "../services/SolicitudService";
import { UsuarioService } from "../services/UsuarioService";

/** Dobles de prueba en memoria: implementan los mismos puertos que Postgres. */
export class Almacen {
  usuarios: Usuario[] = [];
  hashes: { [usuarioId: string]: string } = {};
  sesiones: { huella: string; usuarioId: string; expiraEn: Date }[] = [];
  solicitudes: Solicitud[] = [];
  postulaciones: Postulacion[] = [];
  private secuencia = 0;

  nuevoId(): string {
    this.secuencia++;
    return "00000000-0000-4000-8000-" + ("000000000000" + this.secuencia).slice(-12);
  }
}

class FakeUsuarios implements UsuarioRepository {
  constructor(private a: Almacen) {}
  async crear(d: NuevoUsuario): Promise<Usuario | null> {
    if (this.a.usuarios.some((u) => u.correoElectronico === d.correoElectronico)) return null;
    const u: Usuario = {
      id: this.a.nuevoId(), nombreCompleto: d.nombreCompleto, correoElectronico: d.correoElectronico,
      telefono: d.telefono, estadoVerificacion: "NO_VERIFICADO", disponible: false,
      reputacionPromedio: 0, totalCalificaciones: 0,
    };
    this.a.usuarios.push(u);
    this.a.hashes[u.id] = d.contrasenaHash;
    return u;
  }
  async buscarCredencialesPorCorreo(correo: string): Promise<UsuarioConCredenciales | null> {
    const u = this.a.usuarios.filter((x) => x.correoElectronico === correo)[0];
    return u ? { usuario: u, contrasenaHash: this.a.hashes[u.id] } : null;
  }
  async actualizarDisponibilidad(id: string, disponible: boolean) {
    const u = this.a.usuarios.filter((x) => x.id === id)[0];
    u.disponible = disponible;
    return u;
  }
}

class FakeSesiones implements SesionRepository {
  constructor(private a: Almacen) {}
  async crear(usuarioId: string, huella: string, expiraEn: Date) {
    this.a.sesiones.push({ huella, usuarioId, expiraEn });
  }
  async buscarUsuarioPorHuella(huella: string, ahora: Date): Promise<Usuario | null> {
    const s = this.a.sesiones.filter((x) => x.huella === huella && x.expiraEn.getTime() > ahora.getTime())[0];
    return s ? this.a.usuarios.filter((u) => u.id === s.usuarioId)[0] : null;
  }
}

class FakeHasher implements HasherContrasena {
  async hash(c: string) { return "hash:" + c; }
  async verificar(c: string, h: string) { return h === "hash:" + c; }
}

class FakeTokens implements GestorTokens {
  private n = 0;
  generar() { this.n++; return "tok-" + this.n; }
  huella(t: string) { return "huella:" + t; }
}

class FakeSolicitudes implements SolicitudRepository {
  constructor(private a: Almacen) {}
  async crear(d: NuevaSolicitud): Promise<Solicitud> {
    const s: Solicitud = {
      id: this.a.nuevoId(), solicitanteId: d.solicitanteId, titulo: d.titulo,
      descripcion: d.descripcion, categoria: d.categoria, precio: d.precio, fecha: d.fecha,
      hora: d.hora, ciudad: d.ciudad, zona: d.zona, direccionReferencia: d.direccionReferencia || null,
      estado: "PUBLICADO", trabajadorAceptadoId: null, creadoEn: new Date().toISOString(),
    };
    this.a.solicitudes.push(s);
    return s;
  }
  async buscarPorId(id: string) {
    return this.a.solicitudes.filter((s) => s.id === id)[0] || null;
  }
  buscarPorIdParaActualizar(id: string) {
    return this.buscarPorId(id);
  }
  async listarPublicadas(f: FiltrosListado): Promise<PaginaSolicitudes> {
    const todas = this.a.solicitudes.filter(
      (s) =>
        s.estado === "PUBLICADO" &&
        (!f.zona || s.zona.toLowerCase() === f.zona.toLowerCase()) &&
        (!f.categoria || s.categoria.toLowerCase() === f.categoria.toLowerCase())
    );
    const desde = (f.pagina - 1) * f.limite;
    return { items: todas.slice(desde, desde + f.limite), total: todas.length };
  }
  async asignarTrabajador(id: string, trabajadorId: string) {
    const s = this.a.solicitudes.filter((x) => x.id === id)[0];
    s.estado = "EN_PROCESO";
    s.trabajadorAceptadoId = trabajadorId;
    return s;
  }
}

class FakePostulaciones implements PostulacionRepository {
  constructor(private a: Almacen) {}
  async crear(solicitudId: string, trabajadorId: string): Promise<Postulacion | null> {
    const repetida = this.a.postulaciones.some(
      (p) => p.solicitudId === solicitudId && p.trabajadorId === trabajadorId
    );
    if (repetida) return null;
    const p: Postulacion = {
      id: this.a.nuevoId(), solicitudId, trabajadorId, estado: "PENDIENTE",
      creadoEn: new Date().toISOString(),
    };
    this.a.postulaciones.push(p);
    return p;
  }
  async buscarPorId(id: string) {
    return this.a.postulaciones.filter((p) => p.id === id)[0] || null;
  }
  async listarPorSolicitud(solicitudId: string): Promise<PostulacionConTrabajador[]> {
    return this.a.postulaciones
      .filter((p) => p.solicitudId === solicitudId)
      .map((p) => {
        const u = this.a.usuarios.filter((x) => x.id === p.trabajadorId)[0];
        return {
          ...p,
          trabajador: {
            id: u.id, nombreCompleto: u.nombreCompleto, estadoVerificacion: u.estadoVerificacion,
            reputacionPromedio: u.reputacionPromedio, totalCalificaciones: u.totalCalificaciones,
          },
        };
      });
  }
  async marcarAceptada(id: string) {
    const p = this.a.postulaciones.filter((x) => x.id === id)[0];
    p.estado = "ACEPTADA";
    return p;
  }
  async rechazarOtras(solicitudId: string, exceptoId: string) {
    this.a.postulaciones.forEach((p) => {
      if (p.solicitudId === solicitudId && p.id !== exceptoId && p.estado === "PENDIENTE") {
        p.estado = "RECHAZADA";
      }
    });
  }
}

class FakeUnitOfWork implements UnitOfWork {
  constructor(private repos: Repositorios) {}
  ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    return trabajo(this.repos);
  }
}

/** Fecha "actual" de las pruebas: 16/nov/2026 12:00 hora Colombia. Se puede adelantar. */
export const AHORA = new Date("2026-11-16T12:00:00-05:00");

export function crearEntorno() {
  const almacen = new Almacen();
  const reloj = { ahora: AHORA };
  const usuariosRepo = new FakeUsuarios(almacen);
  const solicitudesRepo = new FakeSolicitudes(almacen);
  const postulacionesRepo = new FakePostulaciones(almacen);
  const leerReloj = () => reloj.ahora;
  return {
    almacen,
    reloj,
    auth: new AuthService(usuariosRepo, new FakeSesiones(almacen), new FakeHasher(), new FakeTokens(), leerReloj),
    usuarios: new UsuarioService(usuariosRepo),
    solicitudes: new SolicitudService(solicitudesRepo, leerReloj),
    postulaciones: new PostulacionService(
      solicitudesRepo,
      postulacionesRepo,
      new FakeUnitOfWork({ solicitudes: solicitudesRepo, postulaciones: postulacionesRepo })
    ),
  };
}
