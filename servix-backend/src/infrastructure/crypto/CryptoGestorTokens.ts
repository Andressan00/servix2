import { createHash, randomBytes } from "crypto";
import { GestorTokens } from "../../domain/puertos";

/** Token aleatorio de 256 bits; en la BD solo se guarda su huella SHA-256. */
export class CryptoGestorTokens implements GestorTokens {
  generar(): string {
    return randomBytes(32).toString("hex");
  }

  huella(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
