import { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, NotFoundError } from "../shared/errors";

/** Si ninguna ruta respondió, la ruta no existe. */
export const manejarRutaInexistente: RequestHandler = (req, _res, next) => {
  next(new NotFoundError("ROUTE_NOT_FOUND", `No existe la ruta ${req.method} ${req.path}`));
};

/**
 * Único punto donde los errores se convierten en respuestas HTTP.
 * Formato: { success:false, error:{ code, message, details } }
 */
export const manejarErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const tipo = (err as { type?: string }).type;
  if (tipo === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "El cuerpo no es un JSON válido" },
    });
    return;
  }
  if (tipo === "entity.too.large") {
    res.status(413).json({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE", message: "El cuerpo es demasiado grande" },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
};
