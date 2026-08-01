import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

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

export async function assinaturaRequired(request, response, next) {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: request.auth.empresaId },
      select: { statusAssinatura: true, trialExpiraEm: true },
    });

    if (!empresa) {
      return response.status(401).json({
        error: "Empresa não encontrada.",
        code: "UNAUTHENTICATED",
      });
    }

    const trialExpirado =
      empresa.statusAssinatura === "TRIAL" &&
      empresa.trialExpiraEm &&
      new Date() > new Date(empresa.trialExpiraEm);

    if (trialExpirado || empresa.statusAssinatura === "CANCELADA") {
      return response.status(402).json({
        error: "Seu período de teste expirou. Escolha um plano para continuar.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    if (empresa.statusAssinatura === "INADIMPLENTE") {
      return response.status(402).json({
        error: "Sua assinatura está com pagamento pendente.",
        code: "PAYMENT_REQUIRED",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
