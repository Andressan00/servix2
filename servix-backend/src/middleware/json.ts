import { RequestHandler } from "express";
import { AppError } from "../shared/errors";

/** Rechaza con 415 los cuerpos que no vengan como application/json. */
export const exigirJson: RequestHandler = (req, _res, next) => {
  const metodoConCuerpo = ["POST", "PUT", "PATCH"].indexOf(req.method) >= 0;
  const tieneCuerpo = Number(req.header("content-length") || 0) > 0;
  if (metodoConCuerpo && tieneCuerpo && !req.is("application/json")) {
    next(new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "El cuerpo debe ser application/json"));
    return;
  }
  next();
};
