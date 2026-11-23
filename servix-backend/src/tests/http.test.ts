import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { crearApp } from "../app";
import { crearEntorno } from "./fakes";

/** Pruebas de la capa HTTP completa (rutas, validación, auth, errores) con repositorios falsos. */
let base = "";
let servidor: ReturnType<ReturnType<typeof crearApp>["listen"]>;

before(async () => {
  const e = crearEntorno();
  const app = crearApp({ version: "test", ...e });
  servidor = app.listen(0);
  await new Promise<void>((r) => servidor.once("listening", () => r()));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/v1`;
});

after(() => {
  servidor.close();
  servidor.closeAllConnections();
});

async function llamar(metodo: string, ruta: string, token?: string, cuerpo?: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(base + ruta, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
  return { status: resp.status, json: (await resp.json()) as any };
}

/** Registra un usuario por la API y devuelve su token. */
async function registrar(nombre: string): Promise<string> {
  const r = await llamar("POST", "/auth/register", undefined, {
    nombreCompleto: nombre,
    correoElectronico: `${nombre}@servix.test`,
    telefono: "3001234567",
    contrasena: "clave1234",
  });
  assert.equal(r.status, 201);
  return r.json.data.token as string;
}

const nueva = {
  titulo: "Arreglar fuga en el baño",
  descripcion: "Gotea el lavamanos del baño principal",
  categoria: "Plomería",
  precio: 80000,
  fecha: "2026-12-01",
  hora: "15:00",
  ciudad: "Bogotá",
  zona: "Chapinero",
  direccionReferencia: "Calle 60 #10-20, apto 301",
};

describe("API HTTP", () => {
  it("GET /health responde sin token", async () => {
    const r = await llamar("GET", "/health");
    assert.equal(r.status, 200);
    assert.equal(r.json.success, true);
    assert.equal(r.json.data.status, "ok");
  });

  it("registro: 201 con token, sin exponer la contraseña; correo repetido 409; campos inválidos 422", async () => {
    const r = await llamar("POST", "/auth/register", undefined, {
      nombreCompleto: "Dani Gómez", correoElectronico: "dani@servix.test",
      telefono: "3001234567", contrasena: "clave1234",
    });
    assert.equal(r.status, 201);
    assert.equal(typeof r.json.data.token, "string");
    assert.equal(r.json.data.usuario.correoElectronico, "dani@servix.test");
    assert.equal(r.json.data.usuario.contrasena, undefined);
    assert.equal(r.json.data.usuario.contrasenaHash, undefined);

    const repetido = await llamar("POST", "/auth/register", undefined, {
      nombreCompleto: "Dani Gómez", correoElectronico: "DANI@servix.test",
      telefono: "3001234567", contrasena: "clave1234",
    });
    assert.equal(repetido.status, 409);
    assert.equal(repetido.json.error.code, "EMAIL_ALREADY_REGISTERED");

    const corta = await llamar("POST", "/auth/register", undefined, {
      nombreCompleto: "X", correoElectronico: "malo", telefono: "1", contrasena: "123",
    });
    assert.equal(corta.status, 422);
    assert.ok(corta.json.error.details.contrasena);
  });

  it("login: 200 con token; credenciales incorrectas 401 con mensaje genérico", async () => {
    const ok = await llamar("POST", "/auth/login", undefined, {
      correoElectronico: "dani@servix.test", contrasena: "clave1234",
    });
    assert.equal(ok.status, 200);
    assert.equal(typeof ok.json.data.token, "string");

    const mal = await llamar("POST", "/auth/login", undefined, {
      correoElectronico: "dani@servix.test", contrasena: "equivocada1",
    });
    const noExiste = await llamar("POST", "/auth/login", undefined, {
      correoElectronico: "nadie@servix.test", contrasena: "clave1234",
    });
    assert.equal(mal.status, 401);
    assert.equal(mal.json.error.code, "INVALID_CREDENTIALS");
    assert.equal(noExiste.json.error.message, mal.json.error.message);
  });

  it("rutas protegidas: sin token 401 TOKEN_REQUIRED; token inventado 401 INVALID_TOKEN", async () => {
    const sin = await llamar("GET", "/services");
    assert.equal(sin.status, 401);
    assert.equal(sin.json.error.code, "TOKEN_REQUIRED");
    const mal = await llamar("GET", "/services", "token-inventado");
    assert.equal(mal.status, 401);
    assert.equal(mal.json.error.code, "INVALID_TOKEN");
  });

  it("ruta inexistente -> 404, JSON malformado -> 400, id inválido -> 400", async () => {
    const tokenX = await registrar("xavi");
    assert.equal((await llamar("GET", "/nada", tokenX)).status, 404);
    const malo = await llamar("POST", "/services", tokenX, "{esto no es json");
    assert.equal(malo.status, 400);
    assert.equal(malo.json.error.code, "INVALID_JSON");
    assert.equal((await llamar("GET", "/services/123", tokenX)).status, 400);
  });

  it("flujo completo: sincronizar, publicar, listar, postular y aceptar", async () => {
    const ana = await registrar("ana");
    const beto = await registrar("beto");

    const invalida = await llamar("POST", "/services", ana, { ...nueva, precio: 0 });
    assert.equal(invalida.status, 422);
    assert.equal(invalida.json.error.details.precio, "Rango permitido: 1-100000000");

    const creada = await llamar("POST", "/services", ana, nueva);
    assert.equal(creada.status, 201);
    assert.equal(creada.json.data.solicitud.estado, "PUBLICADO");
    const id = creada.json.data.solicitud.id as string;

    // Beto (trabajador): sin disponibilidad no puede postularse
    const antes = await llamar("POST", `/services/${id}/applications`, beto);
    assert.equal(antes.status, 409);
    assert.equal(antes.json.error.code, "WORKER_NOT_AVAILABLE");

    const disp = await llamar("PATCH", "/me/availability", beto, { disponible: true });
    assert.equal(disp.status, 200);
    assert.equal(disp.json.data.usuario.disponible, true);

    const lista = await llamar("GET", "/services?zona=chapinero&page=1&limit=10", beto);
    assert.equal(lista.status, 200);
    assert.equal(lista.json.data.items.length, 1);
    assert.equal(lista.json.data.pagination.total, 1);
    assert.equal(lista.json.data.items[0].direccionReferencia, undefined); // dirección oculta

    const postu = await llamar("POST", `/services/${id}/applications`, beto);
    assert.equal(postu.status, 201);
    const postulacionId = postu.json.data.postulacion.id as string;
    assert.equal((await llamar("POST", `/services/${id}/applications`, beto)).status, 409);

    assert.equal((await llamar("GET", `/services/${id}/applications`, beto)).status, 403);
    const verPost = await llamar("GET", `/services/${id}/applications`, ana);
    assert.equal(verPost.status, 200);
    assert.equal(verPost.json.data.total, 1);
    assert.equal(verPost.json.data.items[0].trabajador.correoElectronico, undefined);

    const acepta = await llamar("PATCH", `/services/${id}/accept`, ana, { postulacionId });
    assert.equal(acepta.status, 200);
    assert.equal(acepta.json.data.solicitud.estado, "EN_PROCESO");

    // Beto ya es el trabajador aceptado: ahora sí ve la dirección
    const detalle = await llamar("GET", `/services/${id}`, beto);
    assert.equal(detalle.json.data.solicitud.direccionReferencia, "Calle 60 #10-20, apto 301");

    // Ya no aparece en el listado de disponibles
    const despues = await llamar("GET", "/services?zona=Chapinero", beto);
    assert.equal(despues.json.data.items.length, 0);
  });
});
