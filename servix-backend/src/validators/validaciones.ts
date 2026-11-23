import { CrearSolicitudDto, FiltrosListado, LoginDto, RegistroDto } from "../domain/tipos";
import { BadRequestError, ValidationError } from "../shared/errors";

/**
 * Validación de entrada (formato y rangos). Son funciones puras: reciben datos
 * sin confiar en ellos y devuelven un DTO tipado o lanzan ValidationError (422).
 * Las reglas de NEGOCIO (ej. "no postularse a la propia solicitud") van en los servicios.
 */

type Cuerpo = Record<string, unknown>;
type Detalles = Record<string, string>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const comoCuerpo = (b: unknown): Cuerpo =>
  typeof b === "object" && b !== null && !Array.isArray(b) ? (b as Cuerpo) : {};

function texto(
  c: Cuerpo,
  campo: string,
  min: number,
  max: number,
  detalles: Detalles,
  obligatorio = true
): string | undefined {
  const v = c[campo];
  if (v === undefined || v === null || v === "") {
    if (obligatorio) detalles[campo] = "Campo obligatorio";
    return undefined;
  }
  if (typeof v !== "string") {
    detalles[campo] = "Debe ser texto";
    return undefined;
  }
  const limpio = v.trim();
  if (limpio.length < min || limpio.length > max) {
    detalles[campo] = `Debe tener entre ${min} y ${max} caracteres`;
    return undefined;
  }
  return limpio;
}

function lanzarSiHayErrores(detalles: Detalles): void {
  if (Object.keys(detalles).length > 0) {
    throw new ValidationError("Hay campos inválidos o faltantes", detalles);
  }
}

function esFechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

export function esUuid(valor: string): boolean {
  return UUID.test(valor);
}

/** Valida un id recibido por la URL (Express lo tipa como string o string[]). */
export function exigirUuid(valor: string | string[] | undefined, campo = "id"): string {
  if (typeof valor !== "string" || !esUuid(valor)) {
    throw new BadRequestError("INVALID_ID", `El parámetro ${campo} no es un UUID válido`);
  }
  return valor;
}

export function validarCrearSolicitud(body: unknown): CrearSolicitudDto {
  const c = comoCuerpo(body);
  const d: Detalles = {};

  const titulo = texto(c, "titulo", 4, 120, d);
  const descripcion = texto(c, "descripcion", 10, 2000, d);
  const categoria = texto(c, "categoria", 2, 60, d);
  const ciudad = texto(c, "ciudad", 2, 60, d);
  const zona = texto(c, "zona", 2, 80, d);
  const direccionReferencia = texto(c, "direccionReferencia", 1, 200, d, false);

  let precio = 0;
  if (typeof c.precio !== "number" || !isFinite(c.precio)) {
    d.precio = "Debe ser un número";
  } else if (c.precio < 1 || c.precio > 100000000) {
    d.precio = "Rango permitido: 1-100000000";
  } else {
    precio = c.precio;
  }

  const fecha = typeof c.fecha === "string" ? c.fecha : "";
  if (!esFechaReal(fecha)) d.fecha = "Formato requerido: YYYY-MM-DD (fecha real)";

  const hora = typeof c.hora === "string" ? c.hora : "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) d.hora = "Formato requerido: HH:mm (24 horas)";

  lanzarSiHayErrores(d);

  return {
    titulo: titulo as string,
    descripcion: descripcion as string,
    categoria: categoria as string,
    precio,
    fecha,
    hora,
    ciudad: ciudad as string,
    zona: zona as string,
    direccionReferencia,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function correo(c: Cuerpo, d: Detalles): string {
  const v = texto(c, "correoElectronico", 5, 254, d);
  if (v === undefined) return "";
  if (!EMAIL.test(v)) {
    d.correoElectronico = "Correo electrónico no válido";
    return "";
  }
  return v.toLowerCase();
}

export function validarRegistro(body: unknown): RegistroDto {
  const c = comoCuerpo(body);
  const d: Detalles = {};
  const nombreCompleto = texto(c, "nombreCompleto", 2, 100, d);
  const correoElectronico = correo(c, d);
  const telefono = texto(c, "telefono", 7, 16, d);
  if (telefono !== undefined && !/^\+?\d{7,15}$/.test(telefono)) {
    d.telefono = "Debe contener entre 7 y 15 dígitos (puede iniciar con +)";
  }
  // La contraseña no se recorta: los espacios cuentan.
  const contrasena = typeof c.contrasena === "string" ? c.contrasena : "";
  if (contrasena.length < 8 || contrasena.length > 128) {
    d.contrasena = "Debe tener entre 8 y 128 caracteres";
  }
  lanzarSiHayErrores(d);
  return {
    nombreCompleto: nombreCompleto as string,
    correoElectronico,
    telefono: telefono as string,
    contrasena,
  };
}

export function validarLogin(body: unknown): LoginDto {
  const c = comoCuerpo(body);
  const d: Detalles = {};
  const correoElectronico = correo(c, d);
  const contrasena = typeof c.contrasena === "string" ? c.contrasena : "";
  if (contrasena.length === 0) d.contrasena = "Campo obligatorio";
  lanzarSiHayErrores(d);
  return { correoElectronico, contrasena };
}

export function validarDisponibilidad(body: unknown): boolean {
  const c = comoCuerpo(body);
  if (typeof c.disponible !== "boolean") {
    throw new ValidationError("Hay campos inválidos o faltantes", {
      disponible: "Debe ser true o false",
    });
  }
  return c.disponible;
}

export function validarAceptacion(body: unknown): string {
  const c = comoCuerpo(body);
  if (typeof c.postulacionId !== "string" || !esUuid(c.postulacionId)) {
    throw new ValidationError("Hay campos inválidos o faltantes", {
      postulacionId: "Debe ser el UUID de una postulación",
    });
  }
  return c.postulacionId;
}

function entero(valor: unknown, campo: string, min: number, max: number, porDefecto: number): number {
  if (valor === undefined) return porDefecto;
  const n = typeof valor === "string" && /^\d+$/.test(valor) ? Number(valor) : NaN;
  if (!(n >= min && n <= max)) {
    throw new BadRequestError("INVALID_QUERY", `${campo} debe ser un entero entre ${min} y ${max}`);
  }
  return n;
}

const textoOpcional = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

export function validarListado(query: Record<string, unknown>): FiltrosListado {
  return {
    zona: textoOpcional(query.zona),
    categoria: textoOpcional(query.categoria),
    pagina: entero(query.page, "page", 1, 1000000, 1),
    limite: entero(query.limit, "limit", 1, 100, 20),
  };
}
