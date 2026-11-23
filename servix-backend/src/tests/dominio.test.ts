import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../shared/errors";
import {
  validarCrearSolicitud,
  validarDisponibilidad,
  validarLogin,
  validarRegistro,
} from "../validators/validaciones";
import { crearEntorno } from "./fakes";

async function esperarError(promesa: Promise<unknown>, status: number, code?: string) {
  await assert.rejects(
    promesa,
    (e: unknown) => e instanceof AppError && e.status === status && (!code || e.code === code)
  );
}

const solicitudValida = {
  titulo: "Arreglar fuga en el baño",
  descripcion: "Gotea el lavamanos del baño principal",
  categoria: "Plomería",
  precio: 80000,
  fecha: "2026-12-01",
  hora: "15:00",
  ciudad: "Bogotá",
  zona: "Chapinero",
};

const registroValido = {
  nombreCompleto: "Ana Pérez",
  correoElectronico: "ana@servix.test",
  telefono: "3001234567",
  contrasena: "clave1234",
};

async function escenario() {
  const e = crearEntorno();
  const registrar = async (nombre: string) =>
    (
      await e.auth.registrar({
        ...registroValido,
        nombreCompleto: nombre,
        correoElectronico: `${nombre}@servix.test`,
      })
    ).usuario;
  const ana = await registrar("ana");
  const beto = await registrar("beto");
  const carla = await registrar("carla");
  await e.usuarios.cambiarDisponibilidad(ana, true);
  await e.usuarios.cambiarDisponibilidad(beto, true);
  await e.usuarios.cambiarDisponibilidad(carla, true);
  return { e, ana, beto, carla };
}

describe("Autenticación propia (RF01)", () => {
  it("registra, guarda solo el hash y entrega un token", async () => {
    const e = crearEntorno();
    const r = await e.auth.registrar(registroValido);
    assert.ok(r.token.length > 0);
    assert.equal(r.usuario.disponible, false);
    assert.notEqual(e.almacen.hashes[r.usuario.id], registroValido.contrasena);
  });

  it("rechaza un correo repetido (409 EMAIL_ALREADY_REGISTERED)", async () => {
    const e = crearEntorno();
    await e.auth.registrar(registroValido);
    await esperarError(e.auth.registrar(registroValido), 409, "EMAIL_ALREADY_REGISTERED");
  });

  it("inicia sesión con credenciales correctas", async () => {
    const e = crearEntorno();
    await e.auth.registrar(registroValido);
    const r = await e.auth.iniciarSesion({ correoElectronico: "ana@servix.test", contrasena: "clave1234" });
    assert.equal(r.usuario.nombreCompleto, "Ana Pérez");
  });

  it("da el mismo error si falla la contraseña o no existe el correo", async () => {
    const e = crearEntorno();
    await e.auth.registrar(registroValido);
    await esperarError(
      e.auth.iniciarSesion({ correoElectronico: "ana@servix.test", contrasena: "otraclave1" }),
      401, "INVALID_CREDENTIALS"
    );
    await esperarError(
      e.auth.iniciarSesion({ correoElectronico: "nadie@servix.test", contrasena: "clave1234" }),
      401, "INVALID_CREDENTIALS"
    );
  });

  it("el token identifica al usuario y vence a las 8 horas", async () => {
    const e = crearEntorno();
    const r = await e.auth.registrar(registroValido);
    assert.equal((await e.auth.autenticar(r.token)).id, r.usuario.id);
    await esperarError(e.auth.autenticar("token-inventado"), 401, "INVALID_TOKEN");
    e.reloj.ahora = new Date(e.reloj.ahora.getTime() + 9 * 60 * 60 * 1000);
    await esperarError(e.auth.autenticar(r.token), 401, "INVALID_TOKEN");
  });

  it("valida el registro: contraseña corta, correo y teléfono inválidos", () => {
    try {
      validarRegistro({ ...registroValido, contrasena: "corta", correoElectronico: "no-es-correo", telefono: "abc" });
      assert.fail("debía fallar");
    } catch (e) {
      assert.ok(e instanceof AppError);
      assert.equal(e.status, 422);
      assert.ok(e.details && e.details.contrasena && e.details.correoElectronico && e.details.telefono);
    }
    assert.equal(validarRegistro({ ...registroValido, correoElectronico: "ANA@Servix.TEST" }).correoElectronico, "ana@servix.test");
    assert.throws(() => validarLogin({ correoElectronico: "ana@servix.test" }), AppError);
  });
});

describe("Validaciones (HU03-HU06)", () => {
  it("acepta una solicitud válida", () => {
    const dto = validarCrearSolicitud(solicitudValida);
    assert.equal(dto.precio, 80000);
  });

  it("rechaza precio 0 con detalle del campo (HU04)", () => {
    try {
      validarCrearSolicitud({ ...solicitudValida, precio: 0 });
      assert.fail("debía fallar");
    } catch (e) {
      assert.ok(e instanceof AppError);
      assert.equal(e.status, 422);
      assert.equal(e.details && e.details.precio, "Rango permitido: 1-100000000");
    }
  });

  it("rechaza hora y fecha con formato inválido (HU05)", () => {
    assert.throws(() => validarCrearSolicitud({ ...solicitudValida, hora: "25:00" }), AppError);
    assert.throws(() => validarCrearSolicitud({ ...solicitudValida, fecha: "2026-02-30" }), AppError);
  });

  it("exige campos obligatorios", () => {
    assert.throws(() => validarCrearSolicitud({}), AppError);
    assert.throws(() => validarDisponibilidad({ disponible: "si" }), AppError);
  });
});

describe("SolicitudService (HU03, HU05, HU07)", () => {
  it("publica con estado inicial PUBLICADO", async () => {
    const { e, ana } = await escenario();
    const s = await e.solicitudes.crear(ana, validarCrearSolicitud(solicitudValida));
    assert.equal(s.estado, "PUBLICADO");
    assert.equal(s.solicitanteId, ana.id);
  });

  it("rechaza fechas en el pasado (HU05)", async () => {
    const { e, ana } = await escenario();
    const dto = validarCrearSolicitud({ ...solicitudValida, fecha: "2026-11-15" });
    await esperarError(e.solicitudes.crear(ana, dto), 422, "VALIDATION_ERROR");
  });

  it("acepta hoy si la hora aún no pasó (12:00 -> 18:00)", async () => {
    const { e, ana } = await escenario();
    const dto = validarCrearSolicitud({ ...solicitudValida, fecha: "2026-11-16", hora: "18:00" });
    const s = await e.solicitudes.crear(ana, dto);
    assert.equal(s.hora, "18:00");
  });

  it("filtra por zona y solo lista PUBLICADO (HU07)", async () => {
    const { e, ana } = await escenario();
    await e.solicitudes.crear(ana, validarCrearSolicitud(solicitudValida));
    await e.solicitudes.crear(ana, validarCrearSolicitud({ ...solicitudValida, zona: "Suba" }));
    const r = await e.solicitudes.listarDisponibles({ zona: "chapinero", pagina: 1, limite: 20 });
    assert.equal(r.total, 1);
    assert.equal(r.items[0].zona, "Chapinero");
  });
});

describe("PostulacionService (HU08)", () => {
  async function conSolicitud() {
    const ctx = await escenario();
    const s = await ctx.e.solicitudes.crear(ctx.ana, validarCrearSolicitud(solicitudValida));
    return { ...ctx, s };
  }

  it("bloquea a un trabajador no disponible (WORKER_NOT_AVAILABLE)", async () => {
    const { e, beto, s } = await conSolicitud();
    await e.usuarios.cambiarDisponibilidad(beto, false);
    await esperarError(e.postulaciones.postular(beto, s.id), 409, "WORKER_NOT_AVAILABLE");
  });

  it("no permite postularse a la propia solicitud", async () => {
    const { e, ana, s } = await conSolicitud();
    await esperarError(e.postulaciones.postular(ana, s.id), 409, "OWN_SERVICE");
  });

  it("no permite postularse dos veces (ALREADY_APPLIED)", async () => {
    const { e, beto, s } = await conSolicitud();
    const p = await e.postulaciones.postular(beto, s.id);
    assert.equal(p.estado, "PENDIENTE");
    await esperarError(e.postulaciones.postular(beto, s.id), 409, "ALREADY_APPLIED");
  });

  it("solo el creador ve las postulaciones", async () => {
    const { e, ana, beto, s } = await conSolicitud();
    await e.postulaciones.postular(beto, s.id);
    assert.equal((await e.postulaciones.listarPostulaciones(ana, s.id)).length, 1);
    await esperarError(e.postulaciones.listarPostulaciones(beto, s.id), 403);
  });

  it("aceptar asigna al trabajador, pasa a EN_PROCESO y rechaza al resto", async () => {
    const { e, ana, beto, carla, s } = await conSolicitud();
    const pBeto = await e.postulaciones.postular(beto, s.id);
    const pCarla = await e.postulaciones.postular(carla, s.id);

    const r = await e.postulaciones.aceptar(ana, s.id, pBeto.id);
    assert.equal(r.solicitud.estado, "EN_PROCESO");
    assert.equal(r.solicitud.trabajadorAceptadoId, beto.id);
    assert.equal(r.postulacion.estado, "ACEPTADA");
    assert.equal((await e.almacen.postulaciones.filter((p) => p.id === pCarla.id)[0]).estado, "RECHAZADA");
  });

  it("no se puede aceptar dos veces ni por quien no es el creador", async () => {
    const { e, ana, beto, carla, s } = await conSolicitud();
    const pBeto = await e.postulaciones.postular(beto, s.id);
    await esperarError(e.postulaciones.aceptar(carla, s.id, pBeto.id), 403);
    await e.postulaciones.aceptar(ana, s.id, pBeto.id);
    await esperarError(e.postulaciones.aceptar(ana, s.id, pBeto.id), 409, "SERVICE_NOT_PUBLISHED");
  });

  it("tras aceptar, nadie más puede postularse", async () => {
    const { e, ana, beto, carla, s } = await conSolicitud();
    const pBeto = await e.postulaciones.postular(beto, s.id);
    await e.postulaciones.aceptar(ana, s.id, pBeto.id);
    await esperarError(e.postulaciones.postular(carla, s.id), 409, "SERVICE_NOT_AVAILABLE");
  });
});
