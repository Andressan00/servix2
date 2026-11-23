import { Response } from "express";

/** Envoltura única de respuestas exitosas: { success, data, message }. */
function enviar(res: Response, status: number, data: unknown, message?: string): void {
  res.status(status).json({ success: true, data, message });
}

export const ok = (res: Response, data: unknown, message?: string): void =>
  enviar(res, 200, data, message);

export const creado = (res: Response, data: unknown, message?: string): void =>
  enviar(res, 201, data, message);
