import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { HasherContrasena } from "../../domain/puertos";

function derivar(contrasena: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(contrasena, sal, 64, (error, clave) => (error ? reject(error) : resolve(clave)));
  });
}

/** Contraseñas con scrypt y una sal aleatoria por usuario (formato "sal:hash" en hexadecimal). */
export class ScryptHasher implements HasherContrasena {
  async hash(contrasena: string): Promise<string> {
    const sal = randomBytes(16);
    const clave = await derivar(contrasena, sal);
    return `${sal.toString("hex")}:${clave.toString("hex")}`;
  }

  async verificar(contrasena: string, hash: string): Promise<boolean> {
    const partes = hash.split(":");
    if (partes.length !== 2) return false;
    const esperado = Buffer.from(partes[1], "hex");
    const calculado = await derivar(contrasena, Buffer.from(partes[0], "hex"));
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  }
}
