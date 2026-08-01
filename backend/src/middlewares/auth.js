import jwt from "jsonwebtoken";

export function authRequired(request, response, next) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return response.status(401).json({
      error: "Não autenticado.",
      code: "UNAUTHENTICATED",
    });
  }

  const token = authorization.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (
      typeof payload !== "object" ||
      !payload.usuarioId ||
      !payload.empresaId
    ) {
      return response.status(401).json({
        error: "Token inválido.",
        code: "INVALID_TOKEN",
      });
    }

    request.auth = {
      usuarioId: payload.usuarioId,
      empresaId: payload.empresaId,
    };

    return next();
  } catch {
    return response.status(401).json({
      error: "Token expirado ou inválido.",
      code: "INVALID_TOKEN",
    });
  }
}
