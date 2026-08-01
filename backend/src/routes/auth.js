import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const authRouter = express.Router();

const TRIAL_DIAS = 15;

const modulosPorPlano = {
  STARTER: ["dashboard", "clientes", "agenda", "ordens-servico"],
  PRO: [
    "dashboard",
    "clientes",
    "agenda",
    "ordens-servico",
    "orcamentos",
    "financeiro",
    "produtos",
    "relatorios",
  ],
  BUSINESS: [
    "dashboard",
    "clientes",
    "agenda",
    "ordens-servico",
    "orcamentos",
    "financeiro",
    "produtos",
    "relatorios",
    "usuarios",
    "configuracoes",
    "integracoes",
    "whatsapp",
  ],
};

const registerSchema = z.object({
  empresaNome: z.string().trim().min(2),
  empresaSlug: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido."),
  nome: z.string().trim().min(2),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  senha: z.string().min(8),
  telefone: z.string().trim().optional(),
  plano: z.enum(["STARTER", "PRO", "BUSINESS"]).optional().default("STARTER"),
});

const loginSchema = z.object({
  empresaSlug: z.string().trim().min(3),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  senha: z.string().min(1),
});

function createToken(user) {
  return jwt.sign(
    {
      usuarioId: user.id,
      empresaId: user.empresaId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function serializeUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    cargo: user.cargo,
    avatarUrl: user.avatarUrl,
    empresa: {
      id: user.empresa.id,
      nome: user.empresa.nome,
      slug: user.empresa.slug,
      plano: user.empresa.plano,
      statusAssinatura: user.empresa.statusAssinatura,
      trialExpiraEm: user.empresa.trialExpiraEm,
    },
  };
}

authRouter.post("/register", async (request, response, next) => {
  try {
    const data = registerSchema.parse(request.body);
    const senhaHash = await bcrypt.hash(data.senha, 12);

    const trialExpiraEm = new Date();
    trialExpiraEm.setDate(trialExpiraEm.getDate() + TRIAL_DIAS);

    const result = await prisma.$transaction(async (transaction) => {
      const empresa = await transaction.empresa.create({
        data: {
          nome: data.empresaNome,
          slug: data.empresaSlug,
          email: data.email,
          telefone: data.telefone,
          plano: data.plano,
          statusAssinatura: "TRIAL",
          trialExpiraEm,
          configuracao: {
            create: {},
          },
          modulos: {
            create: modulosPorPlano[data.plano].map((chave) => ({ chave })),
          },
        },
      });

      const usuario = await transaction.usuario.create({
        data: {
          empresaId: empresa.id,
          nome: data.nome,
          email: data.email,
          senhaHash,
          cargo: "ADMIN",
        },
        include: {
          empresa: true,
        },
      });

      return usuario;
    });

    return response.status(201).json({
      token: createToken(result),
      user: serializeUser(result),
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const data = loginSchema.parse(request.body);
    const user = await prisma.usuario.findFirst({
      where: {
        email: data.email,
        empresa: {
          slug: data.empresaSlug,
        },
      },
      include: {
        empresa: true,
      },
    });

    const validPassword =
      user && (await bcrypt.compare(data.senha, user.senhaHash));

    if (!user || !validPassword || user.status !== "ATIVO") {
      return response.status(401).json({
        error: "Empresa, e-mail ou senha inválidos.",
        code: "INVALID_CREDENTIALS",
      });
    }

    return response.json({
      token: createToken(user),
      user: serializeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/forgot-password", async (request, response, next) => {
  try {
    const data = z
      .object({
        empresaSlug: z.string().trim().min(3),
        email: z.string().trim().email(),
      })
      .parse(request.body);

    const user = await prisma.usuario.findFirst({
      where: {
        email: data.email.toLowerCase(),
        empresa: {
          slug: data.empresaSlug,
        },
      },
      select: { id: true },
    });

    return response.json({
      message:
        "Se os dados estiverem cadastrados, as instruções de recuperação serão enviadas.",
      requested: Boolean(user),
    });
  } catch (error) {
    return next(error);
  }
});

export { authRouter };
